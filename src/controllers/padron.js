const Padron = require('../models/Padron');

const toUpper = (s) => (typeof s === 'string' ? s.trim().toUpperCase() : s);
const onlyAllowedFields = ({ mesa, orden, dni, nombre, sexo, note, impugnado, asistido }) => {
  const out = {};
  if (mesa !== undefined) out.mesa = mesa;
  if (orden !== undefined) out.orden = orden;
  if (dni !== undefined) out.dni = String(dni).trim();
  if (nombre !== undefined) out.nombre = toUpper(nombre);
  if (sexo !== undefined) out.sexo = sexo;
  if (note !== undefined) out.note = note;
  if (impugnado !== undefined) out.impugnado = !!impugnado;
  if (asistido !== undefined) out.asistido = !!asistido;
  return out;
};

const createPerson = async (req, res) => {
  try {
    const data = onlyAllowedFields(req.body);
    if (!data.mesa || data.orden == null || !data.dni || !data.nombre || !data.sexo) {
      return res.status(400).json({ message: 'Faltan campos requeridos (mesa, orden, dni, nombre, sexo).' });
    }
    data.nombre = toUpper(data.nombre);
    data.dni = String(data.dni).trim();

    const doc = new Padron(data);
    await doc.save();
    return res.status(200).json({ message: 'Registro creado con éxito.', person: doc });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Registro duplicado (DNI o (mesa, orden) ya existente).' });
    }
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const getPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { dni } = req.query;

    let doc = null;
    if (id) {
      doc = await Padron.findOne({ _id: id, isDeleted: false });
    } else if (dni) {
      doc = await Padron.findOne({ dni: String(dni).trim(), isDeleted: false });
    } else {
      return res.status(400).json({ message: 'Debe enviar id en params o dni en query.' });
    }

    if (!doc) return res.status(404).json({ message: 'Registro no encontrado.' });
    return res.status(200).json({ message: 'Registro obtenido con éxito.', person: doc });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const updatePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = onlyAllowedFields(req.body);
    if (updates.nombre) updates.nombre = toUpper(updates.nombre);
    if (updates.dni) updates.dni = String(updates.dni).trim();

    const updated = await Padron.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Registro no encontrado.' });
    return res.status(200).json({ message: 'Registro actualizado con éxito.', person: updated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Conflicto de unicidad (DNI o (mesa, orden)).' });
    }
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const deletePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Padron.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!deleted) return res.status(404).json({ message: 'Registro no encontrado.' });
    return res.status(200).json({ message: 'Registro eliminado con éxito.', person: deleted });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const listByMesa = async (req, res) => {
  try {
    const { mesa } = req.params;

    const items = await Padron.find({ mesa}).sort({ orden: 1 }).lean();

    if (!items.length) return res.status(404).json({ message: 'Mesa sin registros o inexistente.' });
    return res.status(200).json({ message: 'Listado de mesa obtenido con éxito.', mesa, count: items.length, items });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};


const listPadron = async (req, res) => {
  try {
    const {
      page = 1, limit = 100, paginated = true,
      mesa, dni, q, voted, sort = 'mesa,orden'
    } = req.query;

    const filter = { isDeleted: false };
    if (mesa) filter.mesa = mesa;
    if (dni) filter.dni = String(dni).trim();
    if (voted !== undefined) filter.voted = String(voted) === 'true';
    if (q) {
      const regex = new RegExp(q.trim().toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.nombre = regex;
    }

    const sortObj = {};
    String(sort).split(',').forEach(k => {
      k = k.trim(); if (!k) return;
      sortObj[k.startsWith('-') ? k.slice(1) : k] = k.startsWith('-') ? -1 : 1;
    });

    if (String(paginated) === 'false') {
      const items = await Padron.find(filter).sort(sortObj).lean();
      if (!items.length) return res.status(404).json({ message: 'Padron vacío o sin coincidencias.' });
      return res.status(200).json({ message: 'Listado obtenido con éxito.', count: items.length, items });
    }

    const total = await Padron.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / Number(limit)));
    const current = Math.max(1, Math.min(Number(page), pages));
    const skip = (current - 1) * Number(limit);
    const items = await Padron.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).lean();

    return res.status(200).json({ message: 'Listado obtenido con éxito.', total, pages, currentPage: current, items });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const parseBool = v => v === true || v === 'true' || v === 1 || v === '1';

const markVote = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("ID",id)
    const {
      source = 'manual',
      deviceId,
      note,
      votedAt,        
      impugnado,      
      asistido       
    } = req.body;

    const set = {
      voted: true,
      votedAt: votedAt ? new Date(votedAt) : new Date(),
      votedBy: req.userId || null,
      voteSource: source,
      voteDeviceId: deviceId ?? null,
    };
    if (note !== undefined)      set.note = String(note);
    if (impugnado !== undefined) set.impugnado = parseBool(impugnado);
    if (asistido  !== undefined) set.asistido  = parseBool(asistido);

  
    const doc = await Padron.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, voted: { $ne: true } },
      { $set: set },
      { new: true }
    );

    if (!doc) return res.status(409).json({ message: 'Ya estaba votado o no existe.' });
    return res.status(200).json({ message: 'Voto marcado con éxito.', person: doc });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const unmarkVote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const doc = await Padron.findOne({ _id: id });
    if (!doc) return res.status(404).json({ message: 'Registro no encontrado.' });
    if (!doc.voted) return res.status(409).json({ message: 'La persona no estaba marcada como votó.' });

    doc.voted = false;
    doc.votedAt = null;
    doc.votedBy = null;
    doc.voteSource = 'manual';
    doc.voteDeviceId = null;
    if (note !== undefined) doc.note = note;

    await doc.save();
    return res.status(200).json({ message: 'Voto desmarcado con éxito.', person: doc });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};

const mesaStats = async (req, res) => {
  try {
    const { mesa } = req.params;
    const stats = await Padron.aggregate([
      { $match: { mesa, isDeleted: false } },
      {
        $group: {
          _id: '$mesa',
          total: { $sum: 1 },
          votaron: { $sum: { $cond: ['$voted', 1, 0] } },
          hombres: { $sum: { $cond: [ { $eq: ['$sexo','M'] }, 1, 0] } },
          mujeres: { $sum: { $cond: [ { $eq: ['$sexo','F'] }, 1, 0] } },
          otros:   { $sum: { $cond: [ { $eq: ['$sexo','X'] }, 1, 0] } },
        }
      },
      { $addFields: { pendientes: { $subtract: ['$total', '$votaron'] } } }
    ]);

    if (!stats.length) return res.status(404).json({ message: 'Mesa sin registros o inexistente.' });
    return res.status(200).json({ message: 'Estadísticas obtenidas con éxito.', mesa, stats: stats[0] });
  } catch (error) {
    return res.status(error.code || 500).json({ message: error.message });
  }
};

module.exports = {
  createPerson,
  listPadron,
  getPerson,
  updatePerson,
  deletePerson,
  listByMesa,
  markVote,
  unmarkVote,
  mesaStats,
};