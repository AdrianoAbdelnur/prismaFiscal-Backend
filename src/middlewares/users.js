const User = require('../models/User');
const { body, oneOf } = require('express-validator');

const verifyRegisterFields = () => ([
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail().trim()
    .custom(email => User.findOne({ email }).then(u => {
      if (u) return Promise.reject('Email ya registrado');
    })),

  body('password').isLength({ min: 6, max: 16 }),

  body('name').notEmpty().trim().isLength({ min: 3, max: 24 }),
  body('lastName').notEmpty().trim().isLength({ min: 3, max: 24 }),

  
  body('document')
    .exists().withMessage('DNI requerido')
    .bail()
    .customSanitizer(v => String(v).replace(/\D/g, ''))
    .isLength({ min: 7, max: 10 }).withMessage('DNI inválido')
    .toInt()
    .custom(document => User.findOne({ document }).then(u => {
      if (u) return Promise.reject('DNI ya registrado');
    })),
]);

const verifyLoginFields = () => ([
  oneOf([
    body('email')
      .exists().withMessage('email requerido')
      .bail()
      .isEmail().withMessage('email inválido')
      .normalizeEmail()
      .trim(),

    body('document')
      .exists().withMessage('document requerido')
      .bail()
      .isString().trim()
      .customSanitizer(v => v.replace(/\D/g, ''))
      .isLength({ min: 7, max: 10 }).withMessage('DNI inválido')
      .toInt(),
  ], 'Proporcione un email válido o un DNI'),
  
  body('password').isLength({ min: 6, max: 16 }).withMessage('Password inválido'),
]);



module.exports = {
    verifyRegisterFields,
    verifyLoginFields,
}