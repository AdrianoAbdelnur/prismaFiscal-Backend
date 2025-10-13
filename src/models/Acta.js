const mongoose = require('mongoose');

const ActaSchema = new mongoose.Schema(
  {
    mesaId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    votos: {
      type: Map,
      of: Number, 
      default: {},
    },
    detalle: {
      type: [
        {
          partyId: String,
          nombre: String,
          votos: Number,
        },
      ],
      default: [],
    },
    total: {
      type: Number,
      default: 0,
    },
    photos: {
      type: [String],
      default: [],
    },
    savedAt: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model('Acta', ActaSchema);