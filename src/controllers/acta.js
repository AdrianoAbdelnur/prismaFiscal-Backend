const Acta = require('../models/Acta');

const toIntSafe = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const upsertActa = async (req, res) => {
  try {
    const { mesaId, votos, detalle, total } = req.body;
    if (!mesaId) return res.status(400).json({ message: "mesaId es requerido" });

    const lastActa = await Acta.findOne({ mesaId, isDeleted: false }).sort({ version: -1 });

    let totalCalc = 0;
    if (votos) for (const v of Object.values(votos)) totalCalc += toIntSafe(v);
    else if (detalle) for (const d of detalle) totalCalc += toIntSafe(d.votos);


    if (!lastActa) {
      const newActa = new Acta({
        mesaId,
        votos: votos || {},
        detalle: detalle || [],
        total: total || totalCalc,
        version: 1,
        status: "closed", 
        savedAt: new Date(),
      });
      await newActa.save();
      return res.status(201).json({ message: "Acta creada y cerrada correctamente", acta: newActa });
    }

  
    if (lastActa.status === "closed") {
      const newActa = new Acta({
        mesaId,
        votos: votos || {},
        detalle: detalle || [],
        total: total || totalCalc,
        version: lastActa.version + 1,
        previousActaId: lastActa._id,
        status: "closed", 
        savedAt: new Date(),
      });
      await newActa.save();
      return res.status(201).json({
        message: `Nueva versión cerrada (v${newActa.version}) del acta ${mesaId}`,
        acta: newActa,
      });
    }

    
    const acta = await Acta.findOneAndUpdate(
      { mesaId, isDeleted: false },
      {
        $set: {
          votos: votos || {},
          detalle: detalle || [],
          total: total || totalCalc,
          savedAt: new Date(),
          status: "closed", 
        },
      },
      { new: true }
    );

    res.status(200).json({ message: "Acta actualizada y cerrada correctamente", acta });
  } catch (error) {
    console.error("❌ Error guardando acta:", error);
    res.status(500).json({ message: error.message || "Error al guardar el acta" });
  }
};

const setPhotoBase64 = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const { photoBase64 } = req.body;
    if (!photoBase64) return res.status(400).json({ message: "photoBase64 es requerido" });

    let base64Data = photoBase64;
    let contentType = "image/jpeg";
    if (photoBase64.startsWith("data:")) {
      const match = photoBase64.match(/^data:(.+);base64,(.*)$/);
      if (match) {
        contentType = match[1];
        base64Data = match[2];
      }
    }

    const buffer = Buffer.from(base64Data, "base64");

    let acta = await Acta.findOne({ mesaId, isDeleted: false }).sort({ version: -1 });

    if (!acta) {
      acta = new Acta({
        mesaId,
        votos: {},
        detalle: [],
        total: 0,
        version: 1,
        status: "open",
        photo: { data: buffer, contentType, uploadedAt: new Date() },
        savedAt: new Date(),
      });
    } else {
      acta.photo = { data: buffer, contentType, uploadedAt: new Date() };
    }

    await acta.save();
    res.status(200).json({ message: "Foto guardada correctamente", mesaId });
  } catch (error) {
    console.error("❌ Error en setPhotoBase64:", error);
    res.status(500).json({ message: error.message || "Error al guardar la foto" });
  }
};

const getPhoto = async (req, res) => {
  try {
    const { mesaId } = req.params;

    const acta = await Acta.findOne({ mesaId, isDeleted: false })
      .sort({ version: -1 })
      .select("photo");

    if (!acta || !acta.photo || !acta.photo.data) {
      return res.status(404).json({ message: "Foto no encontrada" });
    }

    res.setHeader("Content-Type", acta.photo.contentType || "image/jpeg");
    res.send(Buffer.from(acta.photo.data));
  } catch (error) {
    console.error("❌ Error en getPhoto:", error);
    res.status(500).json({ message: error.message || "Error al obtener la foto" });
  }
};

const listActas = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const _page = Math.max(1, Number(page));
    const _limit = Math.min(200, Number(limit));
    const skip = (_page - 1) * _limit;

    const actas = await Acta.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { mesaId: 1, version: -1 } },
      {
        $group: {
          _id: "$mesaId",
          latest: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latest" } },
      { $skip: skip },
      { $limit: _limit },

      {
        $addFields: {
          hasPhoto: {
            $cond: [
              { $ifNull: ["$photo.data", false] },
              true,
              false,
            ],
          },
        },
      },

      {
        $project: {
          "photo.data": 0,
        },
      },
    ]);

    const total = await Acta.distinct("mesaId", { isDeleted: false });

    res.status(200).json({
      total: total.length,
      page: _page,
      pages: Math.ceil(total.length / _limit),
      actas,
    });
  } catch (error) {
    console.error("❌ Error en listActas:", error);
    res.status(500).json({ message: error.message || "Error al listar actas" });
  }
};

const closeActa = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const acta = await Acta.findOne({ mesaId, isDeleted: false }).sort({ version: -1 });
    if (!acta) return res.status(404).json({ message: 'Acta no encontrada' });

    acta.status = 'closed';
    await acta.save();

    res.status(200).json({ message: 'Acta cerrada correctamente', acta });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error al cerrar el acta' });
  }
};

const getAllVersions = async (req, res) => {
  try {
    const { mesaId } = req.params;
    const versions = await Acta.find({ mesaId, isDeleted: false })
      .sort({ version: -1 })
      .select('-photo.data');

    res.status(200).json({
      mesaId,
      total: versions.length,
      versions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error al listar versiones' });
  }
};

const getTotalsByParty = async (req, res) => {
  try {
    const totals = await Acta.aggregate([
      { $match: { isDeleted: false, status: 'closed' } },
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
  closeActa,
  getAllVersions,
  getTotalsByParty,
};