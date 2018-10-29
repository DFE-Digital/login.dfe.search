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

module.exports = {
  listUsers,
  listInvitations,
};