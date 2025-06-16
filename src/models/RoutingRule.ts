import { DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  return sequelize.define('RoutingRule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    channels: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    transform: {
      type: DataTypes.JSON,
    },
  });
};