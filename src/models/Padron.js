const mongoose = require('mongoose');

const PadronSchema = new mongoose.Schema(
  {
    mesa:   { type: String, required: true, index: true },
    orden:  { type: Number, required: true },
    dni:    { type: String,  required: true, index: true },
    nombre: { type: String,  required: true, trim: true },
    sexo:   { type: String,  enum: ['M','F','X'], required: true },

    isDeleted: { type: Boolean, default: false },

    voted:     { type: Boolean, default: false, index: true },
    votedAt:   { type: Date },
    votedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    voteSource:{ type: String, enum: ['manual','ocr','import','api'], default: 'manual' },
    voteDeviceId: { type: String },
    note:      { type: String },

    impugnado: { type: Boolean, default: false },
    asistido:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

PadronSchema.index(
  { dni: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
PadronSchema.index(
  { mesa: 1, orden: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

PadronSchema.index({ mesa: 1, voted: 1 });

module.exports = mongoose.model('Padron', PadronSchema);