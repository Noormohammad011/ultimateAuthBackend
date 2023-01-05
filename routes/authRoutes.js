import express from 'express'
import {
  accountActivation,
  signIn,
  signUp,
  userProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/authControllers.js'

import runValidation from '../validators/index.js'
import {
  forgotPasswordValidator,
  resetPasswordValidator,
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
router.put(
  '/forgot-password',
  forgotPasswordValidator,
  runValidation,
  forgotPassword
)
router.put(
  '/reset-password',
  resetPasswordValidator,
  runValidation,
  resetPassword
)

export default router
