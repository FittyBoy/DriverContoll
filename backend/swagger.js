const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AGC Microglass — Car Booking API',
      version: '1.0.0',
      description: 'REST API สำหรับระบบจองรถภายใน AGC Microglass (Schema: mass)',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local Dev' }],
    tags: [
      { name: 'Auth',      description: 'เข้าสู่ระบบ / สมัครสมาชิก' },
      { name: 'Car Types', description: 'ประเภทรถ (Master)' },
      { name: 'Drivers',   description: 'คนขับ (Master)' },
      { name: 'Cars',      description: 'รถ' },
      { name: 'Bookings',  description: 'การจองรถ' },
      { name: 'Admin',     description: 'จัดการระบบ (Admin เท่านั้น)' },
    ],
    components: {
      schemas: {
        CarType: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            name:        { type: 'string',  example: 'Sedan' },
            icon:        { type: 'string',  example: '🚗' },
            description: { type: 'string',  example: 'รถเก๋งทั่วไป' },
          },
        },
        Driver: {
          type: 'object',
          properties: {
            id:        { type: 'integer', example: 1 },
            name:      { type: 'string',  example: 'สมชาย มีสุข' },
            phone:     { type: 'string',  example: '081-111-1111' },
            license:   { type: 'string',  example: 'A1234567' },
            available: { type: 'boolean', example: true },
            note:      { type: 'string',  example: 'ชำนาญเส้นทางกรุงเทพฯ' },
          },
        },
        Car: {
          type: 'object',
          properties: {
            id:          { type: 'integer', example: 1 },
            name:        { type: 'string',  example: 'Toyota Camry' },
            carTypeId:   { type: 'integer', example: 1 },
            typeName:    { type: 'string',  example: 'Sedan' },
            typeIcon:    { type: 'string',  example: '🚗' },
            seats:       { type: 'integer', example: 5 },
            available:   { type: 'boolean', example: true },
            description: { type: 'string',  example: 'รถเก๋งหรู' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id:              { type: 'integer', example: 1 },
            carId:           { type: 'integer', example: 1 },
            carName:         { type: 'string',  example: 'Toyota Camry' },
            driverId:        { type: 'integer', example: 1, nullable: true },
            driverName:      { type: 'string',  example: 'สมชาย มีสุข', nullable: true },
            userId:          { type: 'integer', example: 2 },
            userName:        { type: 'string',  example: 'สมหมาย ใจดี' },
            userEmail:       { type: 'string',  example: 'sommai@agc.com' },
            startDate:       { type: 'string',  format: 'date', example: '2024-07-01' },
            endDate:         { type: 'string',  format: 'date', example: '2024-07-03' },
            days:            { type: 'integer', example: 2 },
            pickupLocation:  { type: 'string',  example: 'โรงงาน MG' },
            dropoffLocation: { type: 'string',  example: 'สนามบิน BKK' },
            notes:           { type: 'string',  example: 'รับแขก VIP' },
            status:          { type: 'string',  enum: ['pending','confirmed','cancelled','completed'], example: 'pending' },
            createdAt:       { type: 'string',  format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'เกิดข้อผิดพลาด' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
      },
    },
  },
  apis: ['./server.js'],
};

module.exports = swaggerJsdoc(options);
