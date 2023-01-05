import express from 'express'
import {
  accountActivation,
  signIn,
  signUp,
  userProfile,
  updateUserProfile,
} from '../controllers/authControllers.js'

import runValidation from '../validators/index.js'
import {
  userSigninValidator,
  userSignupValidator,
} from '../validators/authValidator.js'
import { authorize, requireSignin } from '../middleware/authMiddleware.js'
const router = express.Router()

router.route('/signup').post(userSignupValidator, runValidation, signUp)
router.post('/account-activation', accountActivation)
router.post('/signin', userSigninValidator, runValidation, signIn)
router.get('/user/:id', requireSignin, userProfile)
router.put('/user/update', requireSignin, authorize('admin'), updateUserProfile)
router.put(
  '/user/update',
  requireSignin,
  authorize('subscriber'),
  updateUserProfile
)
export default router
