import express from 'express'
import { accountActivation, signIn, signUp } from '../controllers/authControllers.js'
import runValidation from '../validators/index.js'
import { userSigninValidator, userSignupValidator } from '../validators/authValidator.js'
const router = express.Router()

router.route('/signup').post(userSignupValidator, runValidation, signUp)
router.post('/account-activation', accountActivation)
router.post('/signin', userSigninValidator, runValidation, signIn)
export default router
