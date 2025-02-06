const asyncRetry = require("login.dfe.async-retry");
const { fetchApi } = require("login.dfe.async-retry");
const { apiStrategy } = require("login.dfe.async-retry/lib/strategies");
const omit = require("lodash/omit");
const config = require("../config");
const {
  createLastLoginFilterExpression,
} = require("../../utils/userSearchHelpers");
const { ManagedIdentityCredential  } = require("@azure/identity");
const schMngClientId = process.env.AZURE_SCH_MNG_CLIENT_ID
// Set up the User Managed Identity credentials
const credential = new ManagedIdentityCredential(clientId);

const baseUri = `https://${config.search.azureSearch.serviceName}.search.windows.net/indexes`;
const apiVersion = "2020-06-30";

async function getToken() {
  try {
      // Get the token for Azure Cognitive Search
      const tokenResponse = await credential.getToken("https://search.azure.com/.default");

      return tokenResponse.token;
  } catch (error) {
      throw new Error("Error getting token:", error);
  }
}

const storeDocumentsInIndex = async (name, documents) =>
  asyncRetry(async () => {
    const token = await  getToken()
    const url = `${baseUri}/${name}/docs/index?api-version=${apiVersion}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        value: documents,
      }),
    });

    if (response.status < 200 || response.status > 299) {
      throw new Error(
        `Request failed with status code ${response.status} (POST: ${url})`,
      );
    }

    return {
      statusCode: response.status,
      body: await response.json(),
    };
  }, apiStrategy);

const deleteDocumentInIndex = async (name, id) => {
  const token = await  getToken()
  await fetchApi(`${baseUri}/${name}/docs/index?api-version=${apiVersion}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: {
      value: [
        {
          "@search.action": "delete",
          id,
        },
      ],
    },
  });
};

const searchIndex = async (
  name,
  criteria,
  page,
  pageSize,
  sortBy,
  sortAsc = true,
  filters = undefined,
  searchFields = undefined,
) => {
  const token = await  getToken()
  const skip = (page - 1) * pageSize;
  let uri = `${baseUri}/${name}/docs?api-version=${apiVersion}&search=${criteria}&$count=true&$skip=${skip}&$top=${pageSize}&queryType=full&searchMode=all`;
  if (sortBy) {
    const orderBy = sortAsc ? sortBy : `${sortBy} desc`;
    uri += `&$orderby=${orderBy}`;
  }

  if (searchFields) {
    uri += `&searchFields=${searchFields}`;
  }

  if (filters) {
    let filterParam = "";
    filters.forEach((filter) => {
      if (filterParam.length > 0) {
        filterParam += " and ";
      }
      if (filter.fieldType === "Collection") {
        filterParam += `${filter.field}/any(x: search.in(x, '${filter.values.join(",")}', ','))`;
      } else if (filter.fieldType === "Int64") {
        filterParam += `(${filter.field} eq ${filter.values.join(` or ${filter.field} eq `)})`;
      } else if (filter.field === "lastLogin") {
        const lastLoginFilterUrl = createLastLoginFilterExpression(filter);
        filterParam += `(${lastLoginFilterUrl})`;
      } else {
        filterParam += `(${filter.field} eq '${filter.values.join(`' or ${filter.field} eq '`)}')`;
      }
    });
    uri += `&$filter=${filterParam}`;
  }

  const response = await fetchApi(uri, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  let numberOfPages = 1;
  const totalNumberOfResults = parseInt(response["@odata.count"], 10);
  if (!Number.isNaN(totalNumberOfResults)) {
    numberOfPages = Math.ceil(totalNumberOfResults / pageSize);
  }

  return {
    documents: response.value.map((x) => omit(x, ["@search.score"])),
    totalNumberOfResults,
    numberOfPages,
  };
};

module.exports = {
  storeDocumentsInIndex,
  searchIndex,
  deleteDocumentInIndex,
};
