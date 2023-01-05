import express from 'express'
import {
  accountActivation,
  signIn,
  signUp,
  userProfile,
  updateProfile,
} from '../controllers/authControllers.js'

import runValidation from '../validators/index.js'
import {
  userSigninValidator,
  userSignupValidator,
} from '../validators/authValidator.js'
import { adminMiddleware, requireSignin } from '../middleware/authMiddleware.js'
const router = express.Router()

router.route('/signup').post(userSignupValidator, runValidation, signUp)
router.post('/account-activation', accountActivation)
router.post('/signin', userSigninValidator, runValidation, signIn)
router.get('/user/:id', requireSignin, userProfile)
router.put('/user/update', requireSignin, updateProfile)
router.put('/user/update', requireSignin, adminMiddleware, updateProfile)

export default router
