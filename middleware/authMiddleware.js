import asyncHandler from 'express-async-handler'
import User from '../models/userModel.js'
import { expressjwt as jwt } from 'express-jwt'


const requireSignin = jwt({
  secret: 'noorladlajsfljlasfdlaskdfasflasdf',
  algorithms: ['HS256'],
})

// Grant access to specific roles
const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.auth._id).exec()
    if (!roles.includes(user.role)) {
      return next(
        res.status(403).json({
          error: `User role ${user.role} is not authorized to access this route`,
        })
      )
    }
    next()
  })
}
export { requireSignin, authorize }
