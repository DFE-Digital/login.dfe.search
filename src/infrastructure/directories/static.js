const chunk = require('lodash/chunk');
const pick = require('lodash/pick');
const users = [
  {
    sub: "CA9895AA-4D0E-40B7-8719-719AD7B8924E",
    given_name: "User",
    family_name: "One",
    email: "user.one@static.local",
    status: 1,
    phone_number: null,
    devices: [
      { type: 'Digipass', serialNumber: '1234567890' },
    ],
    codes: [],
    legacyUsernames: ['sauser1'],
    updatedAt: new Date(Date.UTC(2018, 10, 29, 8, 39, 25)),
  },
];

const listUsers = async (page, pageSize, includeDevices, includeCodes, includeLegacyUsernames, changedAfter, correlationId) => {
  const matches = users.filter((user) => !changedAfter || user.updatedAt.getTime() > changedAfter.getTime()).map((user) => {
    const mapped = pick('sub', 'given_name', 'family_name', 'email', 'status', 'phone_number');
    if (includeDevices) {
      mapped.devices = devices;
    }
    if (includeCodes) {
      mapped.codes = codes;
    }
    if (includeLegacyUsernames) {
      mapped.legacyUsernames = legacyUsernames;
    }
  });
  const pages = chunk(matches, pageSize);
  return {
    users: page < pages.length ? pages[page] : [],
    numberOfPages: pages.length,
  };
};
const listInvitations = async (page, pageSize, changedAfter, correlationId) => {
  return Promise.resolve([]);
};

const listDeviceAssociations = async (page, pageSize, correlationId) => {
  return Promise.resolve({
    deviceAssociations: [],
    page,
    numberOfPages: 0,
  });
};

const getInvitation = async (invitationId, correlationId) => {
  return {
    firstName: 'Some',
    lastName: 'User',
    email: 'some.user@test.local',
    keyToSuccessId: '1234567',
    tokenSerialNumber: '12345678901',
    id: invitationId
  };
};

const getUser = async (uid, correlationId) => {
  return {
    sub: '7a1b077a-d7d4-4b60-83e8-1a1b49849510',
    given_name: 'Test',
    family_name: 'Tester',
    email: 'test@localuser.com',
    password: '0dqy81MVA9lqs2+xinvOXbbGMhd18X4pq5aRfiE65pIKxcWB0OtAffY9NdJy0/ksjhBG9EOYywti2WYmtqwxypRil+x0/nBeBlJUfN7/Q9l8tRiDcqq8NghC8wqSEuyzLKXoE/+VDPkW35Vo8czsOp5PT0xN3IQ31vlld/4PqsqQWYE4WBTBO/PO6SoAfNapDxb4M9C8TiReek43pfVL3wTst8Bv4wkeFcLy7NMGVyM48LmjlyvYPIY5NTz8RGOSCAyB7kIxYEsf9SB0Sp0IMGhHIoM8/Yhso3cJNTKTLod0Uz3Htc0JAStugt6RCrnar3Yc7yUzSGDNZcvM31HsP74i5TifaJiavHOiZxjaHYn/KsLFi5/zqNRcYkzN+dYzWY1hjCSY47za9HMh89ZHxGkmrknQY4YKRp/uvg2driXwZDaIm7NUt90mXim4PGM0kYejp9SUwlIGmc5F4QO5F3tBoRb/AYsf3f6mDw7SXAMnO/OVfglvf/x3ICE7UCLkuMXZAECe8MJoJnpP+LVrNQfJjSrjmBYrVRVkS2QFrte0g2WO1SprE9KH8kkmNEmkC6Z3orDczx5jW7LSl37ZHzq1dvMYAJrEoWH21e6ug5usMSl1X6S5uBIsSrj8kOlTYgr4huPjN54aBTVYazCn6UFVrt83E81nbuyZTadrnA4=',
    salt: 'PasswordIs-password-',
  };
};

module.exports = {
  listUsers,
  listInvitations,
  listDeviceAssociations,
  getInvitation,
  getUser,
};
