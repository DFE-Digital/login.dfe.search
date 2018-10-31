const { logs, meta } = require('./sequelize-schema');
const { Op } = require('sequelize');

const mapAuditEntity = (auditEntity) => {
  const audit = {
    type: auditEntity.getDataValue('type'),
    subType: auditEntity.getDataValue('subType'),
    userId: auditEntity.getDataValue('userId') ? auditEntity.getDataValue('userId').toLowerCase() : '',
    level: auditEntity.getDataValue('level'),
    message: auditEntity.getDataValue('message'),
    timestamp: auditEntity.getDataValue('createdAt'),
    organisationId: auditEntity.getDataValue('organisationId'),
  };

  auditEntity.metaData.forEach((meta) => {
    const key = meta.getDataValue('key');
    const value = meta.getDataValue('value');
    const isJson = key === 'editedFields';
    audit[key] = isJson ? JSON.parse(value) : value;
  });

  return audit;
};

const getBatchOfAuditsSince = async (sinceDate, batchSize) => {
  const auditLogs = await logs.findAll({
    where: {
      createdAt: {
        [Op.gt]: sinceDate,
      },
    },
    limit: batchSize,
    order: [['createdAt', 'ASC']],
    include: ['metaData'],
  });

  return auditLogs.map(mapAuditEntity);
};

module.exports = {
  getBatchOfAuditsSince,
};
