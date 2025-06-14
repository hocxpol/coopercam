import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Plans", "useOpenAi", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }),
    queryInterface.addColumn("Plans", "useIntegrations", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Plans", "useOpenAi"),
    queryInterface.removeColumn("Plans", "useIntegrations");
  }
};
