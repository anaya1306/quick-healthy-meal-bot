import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  SelectChangeEvent,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fade,
  IconButton,
  Badge,
  Drawer,
  ImageList,
  ImageListItem,
  Checkbox,
  Divider,
  ListSubheader,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
} from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import { 
  Favorite, 
  FavoriteBorder, 
  BookmarkBorder, 
  RemoveCircleOutline,
  AddCircleOutline,
  RestaurantMenu,
  ShoppingCart,
  Download,
  Delete,
  Share,
} from '@mui/icons-material';
import './App.css';

type DietaryRestriction = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free';

interface NutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

interface GroceryItem {
  name: string;
  category: 'Produce' | 'Meat & Seafood' | 'Dairy' | 'Pantry' | 'Spices' | 'Other';
  checked: boolean;
}

interface ShoppingList {
  items: GroceryItem[];
  recipeId: string;
  recipeName: string;
}

interface Meal {
  name: string;
  ingredients: string[];
  instructions: string;
  nutritionalInfo: NutritionalInfo;
  dietaryRestrictions: DietaryRestriction[];
  prepTime: string;
  servings: number;
  id: string;
  isFavorite?: boolean;
  originalServings: number;
  currentServings: number;
}

function App() {
  const [timeConstraint, setTimeConstraint] = useState<'15min' | '30min'>('15min');
  const [selectedDiet, setSelectedDiet] = useState<DietaryRestriction[]>([]);
  const [currentMeal, setCurrentMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<'API' | 'PARSING' | 'NETWORK' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Meal[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  const API_KEY = process.env.REACT_APP_MEAL_API_KEY;

  const handleTimeChange = (event: SelectChangeEvent) => {
    setTimeConstraint(event.target.value as '15min' | '30min');
  };

  const handleDietChange = (diet: DietaryRestriction) => {
    setSelectedDiet(prev => 
      prev.includes(diet) 
        ? prev.filter(d => d !== diet)
        : [...prev, diet]
    );
  };

  const fetchMealSuggestion = async () => {
    if (!API_KEY) {
      setError('API key is not configured. Please add your API key to the .env file.');
      setErrorType('API');
      return;
    }

    setIsLoading(true);
    setIsGenerating(true);
    setError(null);
    setErrorType(null);

    try {
      console.log('Making API request...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Suggest a healthy meal that takes ${timeConstraint} to prepare${
              selectedDiet.length > 0 ? ` and is ${selectedDiet.join(' and ')}` : ''
            }. Include name, ingredients, instructions, and nutritional information.`}]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const mealSuggestion = data.candidates[0].content.parts[0].text;
      console.log('Raw API response:', mealSuggestion);

      // Parse the response
      const sections = mealSuggestion.split('\n');
      let currentSection = '';
      let name = '';
      let ingredients: string[] = [];
      let instructions = '';
      let nutritionalInfo = {
        calories: '0',
        protein: '0g',
        carbs: '0g',
        fat: '0g',
        fiber: '0g'
      };

      sections.forEach((line: string) => {
        line = line.trim();
        
        // Remove markdown formatting
        line = line.replace(/\*\*/g, '').replace(/\*/g, '');
        
        if (line.toLowerCase().includes('name:')) {
          name = line.split('Name:')[1].trim();
          console.log('Found name:', name);
        } else if (line.toLowerCase().includes('ingredients:')) {
          currentSection = 'ingredients';
          console.log('Switching to ingredients section');
        } else if (line.toLowerCase().includes('instructions:')) {
          currentSection = 'instructions';
          console.log('Switching to instructions section');
        } else if (line.toLowerCase().includes('nutritional information')) {
          currentSection = 'nutrition';
        } else if (line) {
          switch (currentSection) {
            case 'ingredients':
              // More flexible ingredient parsing
              if (line && !line.toLowerCase().includes('ingredients:')) {
                // Clean up the line
                let ingredient = line;
                if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                  ingredient = line.substring(1);
                }
                // Remove any markdown or extra formatting
                ingredient = ingredient.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                if (ingredient) {
                  ingredients.push(ingredient);
                  console.log('Added ingredient:', ingredient);
                }
              }
              break;
            case 'instructions':
              if (!line.toLowerCase().includes('instructions:')) {
                instructions += line + '\n';
                console.log('Added instruction:', line);
              }
              break;
            case 'nutrition':
              if (line.toLowerCase().includes('calories:')) {
                nutritionalInfo.calories = line.split('Calories:')[1].split('-')[0].trim();
              } else if (line.toLowerCase().includes('protein:')) {
                nutritionalInfo.protein = line.split('Protein:')[1].split('-')[0].trim() + 'g';
              } else if (line.toLowerCase().includes('carbs:') || line.toLowerCase().includes('carbohydrates:')) {
                nutritionalInfo.carbs = line.split(/carbs:|carbohydrates:/i)[1].split('-')[0].trim() + 'g';
              }
              break;
          }
        }
      });

      console.log('Parsed data:', {
        name,
        ingredients,
        instructions,
        nutritionalInfo
      });

      const parsedMeal: Meal = {
        name: name || 'Healthy Meal Suggestion',
        ingredients: ingredients,
        instructions: instructions.trim(),
        nutritionalInfo: {
          calories: nutritionalInfo.calories || '0g',
          protein: nutritionalInfo.protein || '0g',
          carbs: nutritionalInfo.carbs || '0g',
          fat: nutritionalInfo.fat || '0g',
          fiber: nutritionalInfo.fiber || '0g'
        },
        dietaryRestrictions: selectedDiet,
        prepTime: timeConstraint === '15min' ? '15 minutes' : '30 minutes',
        servings: 2,
        id: Date.now().toString(),
        originalServings: 4,
        currentServings: 4,
        isFavorite: false
      };
      setCurrentMeal({
        ...parsedMeal,
        id: Date.now().toString(),
        originalServings: 4,
        currentServings: 4,
        isFavorite: false
      });
    } catch (err: any) {
      console.error('Error:', err);
      if (err instanceof TypeError || (typeof err.message === 'string' && err.message.includes('fetch'))) {
        setError('Network error. Please check your internet connection.');
        setErrorType('NETWORK');
      } else if (typeof err.message === 'string' && err.message.includes('API Error')) {
        setError('Error connecting to the meal suggestion service. Please try again.');
        setErrorType('API');
      } else {
        setError('Error processing the meal suggestion. Please try again.');
        setErrorType('PARSING');
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  const toggleFavorite = (meal: Meal) => {
    if (savedRecipes.some(recipe => recipe.id === meal.id)) {
      setSavedRecipes(savedRecipes.filter(recipe => recipe.id !== meal.id));
    } else {
      setSavedRecipes([...savedRecipes, { ...meal, isFavorite: true }]);
    }
    // Save to localStorage
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  };

  const adjustServings = (newServings: number) => {
    if (!currentMeal) return;
    
    const ratio = newServings / currentMeal.originalServings;
    const updatedMeal: Meal = {
      ...currentMeal,
      currentServings: newServings,
      ingredients: currentMeal.ingredients.map(ingredient => {
        const match = ingredient.match(/^([\d.]+)\s*(\w+)\s+(.+)$/);
        if (match) {
          const [, amount, unit, item] = match;
          const newAmount = (parseFloat(amount) * ratio).toFixed(1);
          return `${newAmount} ${unit} ${item}`;
        }
        return ingredient;
      }),
      nutritionalInfo: {
        ...currentMeal.nutritionalInfo,
        calories: `${Math.round(parseFloat(currentMeal.nutritionalInfo.calories) * ratio)}g`,
        protein: `${Math.round(parseFloat(currentMeal.nutritionalInfo.protein) * ratio)}g`,
        carbs: `${Math.round(parseFloat(currentMeal.nutritionalInfo.carbs) * ratio)}g`,
        fat: `${Math.round(parseFloat(currentMeal.nutritionalInfo.fat) * ratio)}g`,
        fiber: `${Math.round(parseFloat(currentMeal.nutritionalInfo.fiber) * ratio)}g`
      }
    };
    setCurrentMeal(updatedMeal);
  };

  const categorizeIngredient = (ingredient: string): GroceryItem['category'] => {
    const lowercase = ingredient.toLowerCase();
    if (lowercase.match(/lettuce|tomato|onion|garlic|vegetable|carrot|pepper|cucumber|potato/)) {
      return 'Produce';
    }
    if (lowercase.match(/chicken|beef|fish|shrimp|pork|meat|salmon/)) {
      return 'Meat & Seafood';
    }
    if (lowercase.match(/milk|cheese|yogurt|cream|butter/)) {
      return 'Dairy';
    }
    if (lowercase.match(/salt|pepper|spice|powder|cumin|paprika/)) {
      return 'Spices';
    }
    if (lowercase.match(/flour|rice|pasta|oil|sauce|can|stock|broth/)) {
      return 'Pantry';
    }
    return 'Other';
  };

  const createShoppingList = (meal: Meal) => {
    const items: GroceryItem[] = meal.ingredients.map(ingredient => ({
      name: ingredient,
      category: categorizeIngredient(ingredient),
      checked: false
    }));

    const newList: ShoppingList = {
      items: items,
      recipeId: meal.id,
      recipeName: meal.name
    };

    setShoppingLists(prev => [...prev, newList]);
    setIsShoppingListOpen(true);
  };

  const toggleItemCheck = (listIndex: number, itemIndex: number) => {
    setShoppingLists(prev => {
      const newLists = [...prev];
      newLists[listIndex] = {
        ...newLists[listIndex],
        items: [...newLists[listIndex].items]
      };
      newLists[listIndex].items[itemIndex] = {
        ...newLists[listIndex].items[itemIndex],
        checked: !newLists[listIndex].items[itemIndex].checked
      };
      return newLists;
    });
  };

  const exportList = (list: ShoppingList) => {
    const text = `Shopping List for ${list.recipeName}\n\n` +
      ['Produce', 'Meat & Seafood', 'Dairy', 'Pantry', 'Spices', 'Other']
        .map(category => {
          const items = list.items.filter(item => item.category === category);
          if (items.length === 0) return '';
          return `${category}:\n${items.map(item => `- ${item.name}`).join('\n')}\n`;
        })
        .filter(Boolean)
        .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${list.recipeName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="md" sx={{
          py: 4,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',  // Subtle gradient background
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        zIndex: -1,
      }
    }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ color: '#2c3e50', fontWeight: 600 }}>
        Quick Healthy Meal Idea Bot 🥗
          </Typography>

      {error && (
        <Fade in={!!error}>
          <Alert 
            severity={
              errorType === 'NETWORK' ? 'error' : 
              errorType === 'API' ? 'warning' : 
              'info'
            }
            sx={{ mb: 3 }}
          >
            <AlertTitle>
              {errorType === 'NETWORK' ? 'Connection Error' :
               errorType === 'API' ? 'Service Error' :
               'Processing Error'}
            </AlertTitle>
            {error}
          </Alert>
        </Fade>
      )}

      <Paper sx={{
        p: 4,
        mb: 4,
        borderRadius: 2,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #84fab0 0%, #8fd3f4 100%)',
        }
      }}>
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Time Available</InputLabel>
                    <Select 
              value={timeConstraint}
              label="Time Available"
                      onChange={handleTimeChange} 
                    >
                      <MenuItem value="15min">15 Minutes</MenuItem>
                      <MenuItem value="30min">30 Minutes</MenuItem>
                    </Select>
                  </FormControl>
                  
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Dietary Restrictions:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'].map((diet) => (
                <Chip
                  key={diet}
                  label={diet}
                  onClick={() => handleDietChange(diet as DietaryRestriction)}
                  color={selectedDiet.includes(diet as DietaryRestriction) ? "primary" : "default"}
                  clickable
                />
              ))}
            </Stack>
          </Box>

          <Button 
            variant="contained" 
                        color="primary"
            size="large"
            onClick={fetchMealSuggestion}
            disabled={isLoading || !API_KEY}
            fullWidth
                    sx={{ 
              background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
              boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              color: 'white',
              height: 48,
              padding: '0 30px',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)',
              }
            }}
          >
            {isLoading ? 'Finding a meal...' : 'Get Meal Suggestion'}
          </Button>
                </Stack>
              </Paper>

      {isLoading && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
          my: 4 
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Cooking up your meal suggestion...
                </Typography>
        </Box>
      )}

      <Fade in={!isGenerating && !!currentMeal}>
        <Box>
          {currentMeal && (
            <Paper sx={{ 
              p: 4, 
              borderRadius: 2,
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                height: '5px',
                background: 'linear-gradient(90deg, #FF9A8B 0%, #FF6A88 55%, #FF99AC 100%)',
              }
            }}>
              <Stack spacing={3}>
                <Box sx={{ textAlign: 'center', mb: 2, position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Typography variant="h4" sx={{ 
                      color: '#2c3e50',
                      fontWeight: 600,
                      mb: 1
                    }}>
                      {currentMeal.name}
                    </Typography>
                    <IconButton 
                      onClick={() => toggleFavorite(currentMeal)}
                      color="primary"
                    >
                      {savedRecipes.some(recipe => recipe.id === currentMeal.id) 
                        ? <Favorite /> 
                        : <FavoriteBorder />}
                    </IconButton>
                    <IconButton
                      onClick={() => createShoppingList(currentMeal)}
                      color="primary"
                      sx={{ ml: 1 }}
                    >
                      <ShoppingCart />
                    </IconButton>
                  </Box>

                  <Box sx={{ mt: 3, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Adjust Servings
                        </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 300, mx: 'auto' }}>
                      <IconButton 
                        onClick={() => adjustServings(Math.max(1, currentMeal.currentServings - 1))}
                        disabled={currentMeal.currentServings <= 1}
                      >
                        <RemoveCircleOutline />
                      </IconButton>
                      <Typography variant="h6">
                        {currentMeal.currentServings} servings
                      </Typography>
                      <IconButton 
                        onClick={() => adjustServings(currentMeal.currentServings + 1)}
                      >
                        <AddCircleOutline />
                      </IconButton>
                    </Box>
                  </Box>

                            <Chip 
                    label={`Prep Time: ${currentMeal.prepTime}`}
                              color="primary"
                    sx={{ 
                      mr: 1,
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      color: 'white',
                      '& .MuiChip-label': {
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }
                    }}
                  />
                  <Chip 
                    label={`Servings: ${currentMeal.currentServings}`}
                    color="secondary"
                  />
                </Box>

                <Box sx={{ 
                  backgroundColor: '#f8f9fa',
                  p: 3,
                  borderRadius: 2
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#2c3e50',
                    fontWeight: 600,
                    borderBottom: '2px solid #3f51b5',
                    pb: 1
                  }}>
                    Ingredients
                  </Typography>
                  <List>
                    {currentMeal.ingredients.map((ingredient, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemIcon>
                          <CheckCircleOutline color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={ingredient} />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Box sx={{ 
                  backgroundColor: '#f8f9fa',
                  p: 3,
                  borderRadius: 2,
                  maxHeight: 'none',
                  overflow: 'visible'
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#2c3e50',
                    fontWeight: 600,
                    borderBottom: '2px solid #3f51b5',
                    pb: 1
                  }}>
                    Instructions
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    lineHeight: 1.8,
                    whiteSpace: 'pre-line',
                    overflow: 'visible',
                    display: 'block',
                    width: '100%'
                  }}>
                    {currentMeal.instructions}
                  </Typography>
                </Box>

                <Box sx={{ 
                  backgroundColor: '#f8f9fa',
                  p: 3,
                  borderRadius: 2
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#2c3e50',
                    fontWeight: 600,
                    borderBottom: '2px solid #3f51b5',
                    pb: 1
                  }}>
                    Nutritional Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Calories
                      </Typography>
                      <Typography variant="h6">
                        {currentMeal.nutritionalInfo.calories}
                      </Typography>
                    </Paper>
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Protein
                      </Typography>
                      <Typography variant="h6">
                        {currentMeal.nutritionalInfo.protein}
                      </Typography>
                    </Paper>
                    <Paper elevation={0} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Carbs
                      </Typography>
                      <Typography variant="h6">
                        {currentMeal.nutritionalInfo.carbs}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
                        </Stack>
            </Paper>
          )}
        </Box>
      </Fade>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 350, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Saved Recipes
          </Typography>
          {savedRecipes.length === 0 ? (
            <Typography color="text.secondary">
              No saved recipes yet
            </Typography>
          ) : (
            <ImageList cols={2} gap={8}>
              {savedRecipes.map((recipe) => (
                <ImageListItem 
                  key={recipe.id}
                  onClick={() => {
                    setCurrentMeal(recipe);
                    setDrawerOpen(false);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box
                              sx={{ 
                      height: 100,
                      bgcolor: 'grey.200',
                                display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px'
                    }}
                  >
                    <RestaurantMenu />
                          </Box>
                  <Typography variant="caption" sx={{ mt: 1 }}>
                    {recipe.name}
                  </Typography>
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </Box>
      </Drawer>

      <IconButton 
        onClick={() => setDrawerOpen(true)}
        sx={{ position: 'fixed', top: 20, right: 20 }}
      >
        <Badge badgeContent={savedRecipes.length} color="primary">
          <BookmarkBorder />
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        open={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
                          sx={{ 
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
            background: 'linear-gradient(to bottom, #ffffff, #f5f7fa)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Shopping Lists
                        </Typography>
          {shoppingLists.map((list, listIndex) => (
            <Box key={list.recipeId} sx={{ mb: 4 }}>
              <Box sx={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                mb: 2 
              }}>
                <Typography variant="subtitle1">
                  {list.recipeName}
                          </Typography>
                <Box>
                  <IconButton onClick={() => exportList(list)} size="small">
                    <Download />
                  </IconButton>
                        </Box>
              </Box>
              
              {['Produce', 'Meat & Seafood', 'Dairy', 'Pantry', 'Spices', 'Other'].map(category => {
                const items = list.items.filter(item => item.category === category);
                if (items.length === 0) return null;
                
                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography 
                      variant="subtitle2" 
                sx={{ 
                        color: 'primary.main',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        pb: 0.5,
                        mb: 1
                      }}
                    >
                      {category}
                    </Typography>
                    <List dense>
                      {items.map((item, itemIndex) => (
                        <ListItem
                          key={item.name}
                          dense
                  sx={{ 
                            textDecoration: item.checked ? 'line-through' : 'none',
                            color: item.checked ? 'text.disabled' : 'text.primary',
                          }}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={item.checked}
                              onChange={() => toggleItemCheck(listIndex, 
                                list.items.findIndex(i => i.name === item.name)
                              )}
                            />
                          </ListItemIcon>
                          <ListItemText primary={item.name} />
                              </ListItem>
                            ))}
                          </List>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Drawer>

      {/* Add a floating decoration element */}
      <Box
                  sx={{ 
          position: 'fixed',
          top: '10%',
          right: '5%',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.4,
          zIndex: -1,
        }}
      />
      <Box
                    sx={{ 
          position: 'fixed',
          bottom: '15%',
          left: '5%',
          width: '250px',
          height: '250px',
          background: 'linear-gradient(135deg, #FF9A8B 0%, #FF6A88 55%, #FF99AC 100%)',
          borderRadius: '50%',
          filter: 'blur(90px)',
          opacity: 0.3,
          zIndex: -1,
        }}
      />
        </Container>
  );
}

export default App;