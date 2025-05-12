const uniq = require("lodash/uniq");
const flatten = require("lodash/flatten");
const { getUserOrganisationsRaw } = require("login.dfe.api-client/users");
const logger = require("../../infrastructure/logger");
const Index = require("./Index");
const { getUser } = require("../../infrastructure/directories");
const { getInvitation } = require("login.dfe.api-client/invitations");
const {
  getInvitationOrganisations,
} = require("../../infrastructure/organisations");
const {
  listUserServices,
  listInvitationServices,
} = require("../../infrastructure/access");
const { mapAsync } = require("../../utils/async");
const { getSearchableString } = require("./utils");

const indexStructure = {
  id: {
    type: "String",
    key: true,
    filterable: true,
  },
  firstName: {
    type: "String",
  },
  lastName: {
    type: "String",
  },
  searchableName: {
    type: "String",
    searchable: true,
    sortable: true,
  },
  email: {
    type: "String",
  },
  searchableEmail: {
    type: "String",
    searchable: true,
    sortable: true,
  },
  primaryOrganisation: {
    type: "String",
    sortable: true,
  },
  organisations: {
    type: "Collection",
    filterable: true,
  },
  searchableOrganisations: {
    type: "Collection",
    searchable: true,
  },
  organisationCategories: {
    type: "Collection",
    filterable: true,
  },
  organisationIdentifiers: {
    type: "Collection",
    searchable: true,
  },
  organisationsJson: {
    type: "String",
    searchable: true,
    filterable: false,
    facetable: false,
    sortable: false,
  },
  services: {
    type: "Collection",
    filterable: true,
  },
  lastLogin: {
    type: "DateTimeOffset",
    sortable: true,
  },
  numberOfSuccessfulLoginsInPast12Months: {
    type: "Int64",
  },
  statusLastChangedOn: {
    type: "Int64",
  },
  statusId: {
    type: "Int64",
    filterable: true,
    sortable: true,
  },
  pendingEmail: {
    type: "String",
  },
  legacyUsernames: {
    type: "Collection",
    searchable: true,
  },
};

const getUserById = async (id, correlationId) => {
  logger.info("Begin get user by id", { correlationId });

  const user = await getUser(id, correlationId);
  const mapped = {
    id: user.sub,
    firstName: user.given_name,
    lastName: user.family_name,
    email: user.email,
    statusId: user.status,
    lastLogin: user.last_login ? new Date(user.last_login) : null,
    legacyUsernames: user.legacyUsernames,
  };
  return [mapped];
};

const getInvitationById = async (id, correlationId) => {
  logger.info("Begin get invitation by id", { correlationId });

  const invitation = await getInvitation({ by: { id: id.substr(4) } });
  if (!invitation.isCompleted) {
    const mapped = {
      id: `inv-${invitation.id}`,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      email: invitation.email,
      statusId: invitation.deactivated ? -2 : -1,
    };
    return [mapped];
  }
  return null;
};

const getOrganisations = async (documentId) => {
  let accessibleOrganisations;
  if (documentId.startsWith("inv-")) {
    accessibleOrganisations = await getInvitationOrganisations(
      documentId.substr(4),
    );
  } else {
    accessibleOrganisations = await getUserOrganisationsRaw({
      userId: documentId,
    });
  }
  return accessibleOrganisations.map((accessibleOrganisation) => ({
    id: accessibleOrganisation.organisation.id,
    name: accessibleOrganisation.organisation.name,
    urn: accessibleOrganisation.organisation.urn,
    uid: accessibleOrganisation.organisation.uid,
    ukprn: accessibleOrganisation.organisation.ukprn,
    category: accessibleOrganisation.organisation.category
      ? accessibleOrganisation.organisation.category.id
      : undefined,
    establishmentNumber:
      accessibleOrganisation.organisation.establishmentNumber,
    laNumber: accessibleOrganisation.organisation.localAuthority
      ? accessibleOrganisation.organisation.localAuthority.establishmentNumber
      : undefined,
    status: accessibleOrganisation.organisation.status
      ? accessibleOrganisation.organisation.status.id
      : 0,
    role: accessibleOrganisation.role ? accessibleOrganisation.role.id : 0,
    numericIdentifier: accessibleOrganisation.numericIdentifier,
    textIdentifier: accessibleOrganisation.textIdentifier,
  }));
};
const getServices = async (documentId, correlationId) => {
  let services;
  if (documentId.startsWith("inv-")) {
    services = await listInvitationServices(
      documentId.substr(4),
      correlationId,
    );
  } else {
    services = await listUserServices(documentId, correlationId);
  }
  return services ? services.map((service) => service.serviceId) : [];
};

class UserIndex extends Index {
  constructor() {
    super("users", indexStructure);
  }

  async search(
    criteria,
    page = 1,
    pageSize = 25,
    sortBy = "searchableName",
    sortAsc = true,
    filters = undefined,
    searchFields = undefined,
  ) {
    const pageOfDocuments = await super.search(
      criteria,
      page,
      pageSize,
      sortBy,
      sortAsc,
      filters,
      searchFields,
    );
    const users = pageOfDocuments.documents.map((document) => ({
      id: document.id,
      firstName: document.firstName,
      lastName: document.lastName,
      email: document.email,
      primaryOrganisation: document.primaryOrganisation,
      organisations: JSON.parse(document.organisationsJson),
      services: document.services,
      lastLogin: document.lastLogin ? new Date(document.lastLogin) : null,
      numberOfSuccessfulLoginsInPast12Months:
        document.numberOfSuccessfulLoginsInPast12Months,
      statusLastChangedOn: document.statusLastChangedOn
        ? new Date(document.statusLastChangedOn)
        : null,
      statusId: document.statusId,
      pendingEmail: document.pendingEmail,
      legacyUsernames: document.legacyUsernames,
    }));
    return {
      users,
      totalNumberOfResults: pageOfDocuments.totalNumberOfResults,
      numberOfPages: pageOfDocuments.numberOfPages,
    };
  }

  async store(users, correlationId) {
    const documents = await mapAsync(users, async (user, index) => {
      const searchableName = getSearchableString(
        `${user.firstName}${user.lastName}`,
      );
      const searchableEmail = getSearchableString(user.email);
      const document = { searchableName, searchableEmail, ...user };
      if (!document.legacyUsernames) {
        document.legacyUsernames = [];
      }
      if (document.organisationsJson) {
        const orgsModel = JSON.parse(document.organisationsJson);
        if (!document.primaryOrganisation) {
          document.primaryOrganisation =
            orgsModel.length > 0 ? orgsModel[0].name : undefined;
        }
        if (!document.organisations) {
          document.organisations = uniq(orgsModel.map((x) => x.id));
        }
        if (!document.searchableOrganisations) {
          document.searchableOrganisations = uniq(
            orgsModel.map((x) => getSearchableString(x.name)),
          );
        }
        if (!document.organisationCategories) {
          document.organisationCategories = uniq(
            orgsModel.map((x) => x.category),
          ).filter((x) => x !== undefined);
        }
        if (!document.organisationIdentifiers) {
          document.organisationIdentifiers = flatten(
            orgsModel.map((orgMap) => [
              orgMap.urn,
              orgMap.uid,
              orgMap.establishmentNumber,
              orgMap.localAuthority
                ? orgMap.localAuthority.establishmentNumber
                : undefined,
            ]),
          ).filter((id) => id !== undefined && id !== null);
        }
      }
      if (!document.organisations) {
        logger.debug(
          `getting organisations for ${document.id} (${index + 1} of ${users.length})`,
          { correlationId },
        );
        const organisations = await getOrganisations(document.id);
        document.primaryOrganisation =
          organisations.length > 0 ? organisations[0].name : undefined;
        document.organisations = uniq(organisations.map((x) => x.id));
        document.searchableOrganisations = uniq(
          organisations.map((x) => getSearchableString(x.name)),
        );
        document.organisationCategories = uniq(
          organisations.map((x) => x.category),
        ).filter((x) => x !== undefined);
        document.organisationIdentifiers = flatten(
          organisations.map((x) => [
            x.urn,
            x.uid,
            x.establishmentNumber,
            x.localAuthority ? x.localAuthority.establishmentNumber : undefined,
          ]),
        ).filter((id) => id !== undefined && id !== null);
        document.organisationsJson = JSON.stringify(
          organisations.map((orgMap) => ({
            id: orgMap.id,
            name: orgMap.name,
            urn: orgMap.urn,
            uid: orgMap.uid,
            ukprn: orgMap.ukprn,
            establishmentNumber: orgMap.establishmentNumber,
            laNumber: orgMap.laNumber,
            categoryId: orgMap.category ? orgMap.category : undefined,
            statusId: orgMap.status || 0,
            roleId: orgMap.role,
            numericIdentifier: orgMap.numericIdentifier,
            textIdentifier: orgMap.textIdentifier,
          })),
        );
      }
      if (!document.services) {
        logger.debug(
          `getting services for ${document.id} (${index + 1} of ${users.length})`,
          { correlationId },
        );
        document.services = await getServices(document.id);
      }
      document.lastLogin = document.lastLogin ? document.lastLogin : null;
      document.statusLastChangedOn = document.statusLastChangedOn
        ? document.statusLastChangedOn.getTime()
        : undefined;
      return document;
    });
    return super.store(documents, correlationId);
  }

  async indexUserById(id, correlationId) {
    if (id.startsWith("inv-")) {
      const invitation = await getInvitationById(id, correlationId);
      if (invitation !== null) {
        logger.debug(`Invitation ${id} for indexing into ${this.name}`, {
          correlationId,
        });
        await this.store(invitation, correlationId);
      }
    } else {
      const user = await getUserById(id, correlationId);
      logger.debug(`User ${id} for indexing into ${this.name}`, {
        correlationId,
      });
      await this.store(user, correlationId);
    }
  }

  async deleteUserById(id) {
    logger.debug(`Deleting document with id: ${id}`);
    await super.delete(id);
  }
}

module.exports = UserIndex;
