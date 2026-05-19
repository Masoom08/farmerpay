'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FieldLandDocumentAssociation extends Model {
    static associate(models) {
      FieldLandDocumentAssociation.belongsTo(models.Field, {
        foreignKey: 'field_id',
        as: 'field',
      });
    }
  }

  FieldLandDocumentAssociation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id',
        },
      },
      document_id: {
        type: DataTypes.INTEGER,
      },
      document_type: {
        type: DataTypes.ENUM('title_deed', 'lease_agreement', 'patta', 'adangal', 'revenue_receipt'),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'FieldLandDocumentAssociation',
      tableName: 'field_land_document_associations',
      timestamps: true,
      underscored: true,
    }
  );

  return FieldLandDocumentAssociation;
};
