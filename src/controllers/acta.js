const Acta = require('../models/Acta');
const mongoose = require('mongoose');

// 🔹 Utilidad para sanitizar votos (convierte strings a números)
const toIntSafe = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// 🔹 Crea o actualiza un acta (por mesaId)
const upsertActa = async (req, res) => {
  try {
    const { mesaId, votos, detalle, total } = req.body;
    if (!mesaId) return res.status(400).json({ message: 'mesaId es requerido' });

    // Si no se mandó total, lo calculamos
    let totalCalc = 0;
    if (votos) {
      for (const v of Object.values(votos)) totalCalc += toIntSafe(v);
    } else if (detalle) {
      for (const d of detalle) totalCalc += toIntSafe(d.votos);
    }

    const update = {
      votos: votos || {},
      detalle: detalle || [],
      total: total || totalCalc,
      savedAt: new Date(),
    };

    const acta = await Acta.findOneAndUpdate(
      { mesaId, isDeleted: false },
      { $set: update, $setOnInsert: { mesaId } },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Acta guardada correctamente', acta });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error al guardar el acta' });
  }
};


const setPhotoBase64 = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const { photoBase64 } = req.body;

    if (!photoBase64) {
      return res.status(400).json({ message: 'photoBase64 es requerido' });
    }

    // Puede venir como "data:image/jpeg;base64,AAAA..." o solo "AAAA..."
    const match = photoBase64.match(/^data:(.+);base64,(.*)$/);
    const contentType = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : photoBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    const acta = await Acta.findOneAndUpdate(
      { mesaId, isDeleted: false },
      {
        $set: {
          photo: {
            data: buffer,
            contentType,
            uploadedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!acta) return res.status(404).json({ message: 'Acta no encontrada' });

    res.status(200).json({ message: 'Foto guardada correctamente', mesaId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error al guardar la foto' });
  }
};

// 🔹 Obtener la foto para mostrarla
const getPhoto = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const acta = await Acta.findOne({ mesaId, isDeleted: false }, { photo: 1 });
    if (!acta || !acta.photo || !acta.photo.data) {
      return res.status(404).send('Foto no encontrada');
    }

    res.set('Content-Type', acta.photo.contentType || 'image/jpeg');
    res.send(acta.photo.data);
  } catch (error) {
    res.status(500).send(error.message || 'Error al obtener la foto');
  }
};

// 🔹 Listar actas (paginado opcional)
const listActas = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const _page = Math.max(1, Number(page));
    const _limit = Math.min(200, Number(limit));
    const skip = (_page - 1) * _limit;

    const [totalCount, items] = await Promise.all([
      Acta.countDocuments({ isDeleted: false }),
      Acta.find({ isDeleted: false })
        .sort({ mesaId: 1 })
        .skip(skip)
        .limit(_limit)
        .select('-photo.data'), // no mandamos la foto entera al listar
    ]);

    res.status(200).json({
      total: totalCount,
      page: _page,
      pages: Math.ceil(totalCount / _limit),
      actas: items,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error al listar actas' });
  }
};

// 🔹 Borrado lógico
const deleteActa = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const acta = await Acta.findOneAndUpdate(
      { mesaId, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!acta) return res.status(404).json({ message: 'Acta no encontrada' });
    res.status(200).json({ message: 'Acta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error al eliminar acta' });
  }
};


const getTotalsByParty = async (req, res) => {
  try {
    const totals = await Acta.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$detalle" },
      {
        $group: {
          _id: "$detalle.partyId",
          totalVotos: { $sum: "$detalle.votos" },
          nombres: { $addToSet: "$detalle.nombre" },
        },
      },
      {
        $project: {
          _id: 0,
          partyId: "$_id",
          nombre: { $arrayElemAt: ["$nombres", 0] },
          totalVotos: 1,
        },
      },
      { $sort: { totalVotos: -1 } },
    ]);

    res.status(200).json({ message: 'Totales por partido', totals });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error al calcular totales' });
  }
};

module.exports = {
  upsertActa,
  setPhotoBase64,
  getPhoto,
  listActas,
  deleteActa,
  getTotalsByParty
};