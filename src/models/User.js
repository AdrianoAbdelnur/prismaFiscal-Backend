const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    document: {
      type: Number,
      unique: true, 
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['fiscal', 'superFiscal', 'admin', 'interAdmin'],
      default: 'fiscal',
    },
    phoneNumber: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,     
    versionKey: false,    
  }
);

module.exports = mongoose.model('User', UserSchema);