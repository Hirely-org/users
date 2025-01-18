module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('Users', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        sub:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        roleId: {  // 🔹 Rename `role` to `roleId` for clarity
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Roles',  // 🔹 Points to the Roles table
                key: 'id'
            }
        },
        picture:{
            type: DataTypes.STRING,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        }
    });

    // 🔹 Define Association
    User.associate = (models) => {
        User.belongsTo(models.Roles, { 
            foreignKey: 'roleId',  
            as: 'role'  // Alias for the relation
        });
    };

    return User;
};
