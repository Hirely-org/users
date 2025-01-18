module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define('Roles', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    }, {
        timestamps: false,
    });

    // 🔹 Define Association
    Role.associate = (models) => {
        Role.hasMany(models.Users, { 
            foreignKey: 'roleId',  // Matches the foreign key in Users table
            as: 'users'  // Alias for the relation
        });
    };

    return Role;
};
