import { Router } from 'express';
import { 
  getAllCommonAnswers, 
  getCommonAnswer,
  saveCommonAnswer, 
  deleteCommonAnswer,
  CommonAnswer 
} from '../../lib/db.js';

const router = Router();

// GET /api/common-answers - Get all common answers
router.get('/', (req, res) => {
  try {
    const answers = getAllCommonAnswers();
    res.json(answers);
  } catch (error) {
    console.error('Error fetching common answers:', error);
    res.status(500).json({ error: 'Failed to fetch common answers' });
  }
});

// GET /api/common-answers/:key - Get a specific common answer
router.get('/:key', (req, res) => {
  try {
    const answer = getCommonAnswer(req.params.key);
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    res.json(answer);
  } catch (error) {
    console.error('Error fetching common answer:', error);
    res.status(500).json({ error: 'Failed to fetch common answer' });
  }
});

// POST /api/common-answers - Create or update a common answer
router.post('/', (req, res) => {
  try {
    const answerData: Omit<CommonAnswer, 'id' | 'created_at' | 'updated_at'> = {
      question_key: req.body.question_key || '',
      answer_text: req.body.answer_text || '',
      description: req.body.description
    };
    
    // Validate required fields
    if (!answerData.question_key || !answerData.answer_text) {
      return res.status(400).json({ error: 'Question key and answer text are required' });
    }
    
    saveCommonAnswer(answerData);
    
    // Return updated answers list
    const answers = getAllCommonAnswers();
    res.json(answers);
  } catch (error) {
    console.error('Error saving common answer:', error);
    res.status(500).json({ error: 'Failed to save common answer' });
  }
});

// DELETE /api/common-answers/:key - Delete a common answer
router.delete('/:key', (req, res) => {
  try {
    deleteCommonAnswer(req.params.key);
    
    // Return updated answers list
    const answers = getAllCommonAnswers();
    res.json(answers);
  } catch (error) {
    console.error('Error deleting common answer:', error);
    res.status(500).json({ error: 'Failed to delete common answer' });
  }
});

export default router;

