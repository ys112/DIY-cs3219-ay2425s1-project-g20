import { Request, Response } from 'express'
import { Query } from 'firebase-admin/firestore'
import { db } from '../db/clients'
import { Question, questionSchema } from '../model'

export async function getAllQuestionsWithConditions(req: Request, res: Response) {
  try {
    const { complexity, categories } = req.body

    let query: Query = db

    if (complexity) {
      query = query.where('complexity', '==', complexity)
    }

    const snapshot = await query.get()
    const questions: Question[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Question),
    }))

    let filteredQuestions = questions

    if (categories && Array.isArray(categories)) {
      filteredQuestions = questions.filter((question) => {
        return categories.every((value) => question.categories.includes(value))
      })
    }

    res.status(200).json(filteredQuestions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' })
  }
}

export async function getQuestion(req: Request, res: Response) {
  try {
    const doc = await db.doc(req.params.id).get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Question not found' })
    }
    res.status(200).json({ id: doc.id, ...doc.data() })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch question' })
  }
}

export async function createQuestion(req: Request, res: Response) {
  try {
    const parsedRequest = questionSchema.safeParse(req.body)
    if (!parsedRequest.success) {
      return res.status(400).json({ error: parsedRequest.error })
    }
    const { data } = parsedRequest

    const existingQuestionSnapshot = await db.where('title', '==', data.title).get()

    if (!existingQuestionSnapshot.empty) {
      return res.status(409).json({ error: 'A question with this title already exists' })
    }

    const newQuestionRef = await db.add(data)
    res.status(201).json({ id: newQuestionRef.id, ...data })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question' })
  }
}

export async function updateQuestion(req: Request, res: Response) {
  try {
    const parsedRequestBody = questionSchema
      .partial()
      .refine(
        (val) =>
          Object.keys(val).map((key) => val[key as keyof typeof val] !== undefined),
        {
          message: 'Please provide at least one field',
        }
      )
      .safeParse(req.body)
    if (!parsedRequestBody.success) {
      return res.status(400).json({ error: parsedRequestBody.error })
    }
    const { data } = parsedRequestBody

    const existingQuestionSnapshot = await db.where('title', '==', data.title).get()

    if (!existingQuestionSnapshot.empty) {
      return res.status(409).json({ error: 'A question with this title already exists' })
    }

    await db.doc(req.params.id).update(data)
    res.status(200).json({ message: 'Question updated successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update question' })
  }
}

export async function deleteQuestion(req: Request, res: Response) {
  try {
    await db.doc(req.params.id).delete()
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question' })
  }
}