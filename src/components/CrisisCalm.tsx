import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Slider,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';

interface EmotionalState {
  intensity: number;
  description: string;
  timestamp: Date;
}

interface AIResponse {
  message: string;
  techniques: string[];
  nextSteps: string[];
}

function CrisisCalm() {
  const [emotionalState, setEmotionalState] = useState<EmotionalState>({
    intensity: 5,
    description: '',
    timestamp: new Date()
  });
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  const handleIntensityChange = (_event: Event, newValue: number | number[]) => {
    setEmotionalState(prev => ({
      ...prev,
      intensity: newValue as number
    }));
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmotionalState(prev => ({
      ...prev,
      description: event.target.value
    }));
  };

  const getEmotionalLabel = (intensity: number): string => {
    if (intensity <= 2) return 'Calm';
    if (intensity <= 4) return 'Mild Distress';
    if (intensity <= 6) return 'Moderate Distress';
    if (intensity <= 8) return 'High Distress';
    return 'Crisis';
  };

  const fetchAIResponse = async () => {
    if (!API_KEY) {
      setError('API key is not configured. Please add your API key to the .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `As an empathetic AI counselor, provide a supportive response to someone experiencing the following emotional state:
              Intensity Level: ${emotionalState.intensity}/10 (${getEmotionalLabel(emotionalState.intensity)})
              Description: ${emotionalState.description}
              
              Please provide:
              1. A validating and empathetic response
              2. 2-3 specific coping techniques they can try right now
              3. Gentle next steps for moving forward
              
              Format the response in a structured way that's easy to read.`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const data = await response.json();
      const aiMessage = data.candidates[0].content.parts[0].text;

      // Parse the AI response into sections
      const sections = aiMessage.split('\n\n');
      setAiResponse({
        message: sections[0] || '',
        techniques: sections[1]?.split('\n').filter((t: string) => t.trim()) || [],
        nextSteps: sections[2]?.split('\n').filter((s: string) => s.trim()) || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching AI response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Crisis-to-Calm AI Support 🌱
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              How intense are your emotions right now?
            </Typography>
            <Slider
              value={emotionalState.intensity}
              onChange={handleIntensityChange}
              min={1}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
            <Typography color="text.secondary">
              Current Level: {getEmotionalLabel(emotionalState.intensity)}
            </Typography>
          </Box>

          <TextField
            multiline
            rows={4}
            fullWidth
            label="What's on your mind? (optional)"
            value={emotionalState.description}
            onChange={handleDescriptionChange}
            placeholder="Share as much or as little as you feel comfortable with..."
          />

          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={fetchAIResponse}
            disabled={isLoading || !API_KEY}
            fullWidth
          >
            {isLoading ? 'Getting Support...' : 'Get Support'}
          </Button>
        </Stack>
      </Paper>

      {isLoading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {aiResponse && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Response:
                </Typography>
                <Typography variant="body1">
                  {aiResponse.message}
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Coping Techniques to Try:
                </Typography>
                <ul>
                  {aiResponse.techniques.map((technique, index) => (
                    <li key={index}>
                      <Typography variant="body1">{technique}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Next Steps:
                </Typography>
                <ul>
                  {aiResponse.nextSteps.map((step, index) => (
                    <li key={index}>
                      <Typography variant="body1">{step}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
        Note: This is an AI support tool and not a replacement for professional mental health care. 
        If you're experiencing a mental health emergency, please contact emergency services or a crisis helpline immediately.
      </Typography>
    </Container>
  );
}

export default CrisisCalm; 