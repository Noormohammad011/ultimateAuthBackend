import asyncHandler from 'express-async-handler'
import User from '../models/userModel.js'
import { expressjwt as jwt } from 'express-jwt'


const requireSignin = jwt({
  secret: 'noorladlajsfljlasfdlaskdfasflasdf',
  algorithms: ['HS256'],
})


const adminMiddleware = (req, res, next) => {
  User.findById({ _id: req.auth._id }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      })
    }

    if (user.role !== 'admin') {
      return res.status(400).json({
        error: 'Admin resource. Access denied.',
      })
    }

    req.profile = user
    next()
  })
}
export { requireSignin, adminMiddleware }
