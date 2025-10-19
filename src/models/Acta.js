const mongoose = require('mongoose');

const ActaSchema = new mongoose.Schema(
  {
    mesaId: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    previousActaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Acta',
      default: null, 
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'reopened'],
      default: 'open',
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
    photo: {
      data: Buffer,
      contentType: String,
      uploadedAt: Date,
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


ActaSchema.index({ mesaId: 1, version: -1 });

module.exports = mongoose.model('Acta', ActaSchema);