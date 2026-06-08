/** @format */

'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		const now = new Date();

		await queryInterface.bulkInsert('Users', [
			{
				username: 'alexchandra',
				email: 'alexchandra@gmail.com',
				phoneNumber: '0823888197372',
				password: bcrypt.hashSync('Chandra@1998'),
				about: 'Hai, saya menggunakan ChatRealtime',
				code: '1',
				failed: 0,
				expiredCode: null,
				lastLogin: null,
				isActive: true,
				statusActive: false,
				createdAt: now,
				updatedAt: now,
			},
		]);
	},

	async down(queryInterface) {
		await queryInterface.bulkDelete('Users', {
			email: 'alexchandra@gmail.com',
		});
	},
};
