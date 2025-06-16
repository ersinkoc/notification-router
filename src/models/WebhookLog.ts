import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  return sequelize.define('WebhookLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    headers: {
      type: DataTypes.JSON,
    },
    status: {
      type: DataTypes.ENUM('received', 'processed', 'failed'),
      defaultValue: 'received',
    },
    error: {
      type: DataTypes.TEXT,
    },
  });
};