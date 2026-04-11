import express from 'express'
import { getUsers, deleteUser, updateUser } from '../controllers/user.controllers.js'
import { isAuthenticated } from '../middleware/isAuth/isAuthenticated.js'
const router = express.Router()

router.get('/users', isAuthenticated, getUsers)
router.delete('/user/:id', isAuthenticated, deleteUser)
router.put('/user/:id', isAuthenticated, updateUser)
export default router