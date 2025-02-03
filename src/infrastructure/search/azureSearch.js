const asyncRetry = require("login.dfe.async-retry");
//const { fetchApi } = require("login.dfe.async-retry");
const { apiStrategy } = require("login.dfe.async-retry/lib/strategies");
const omit = require("lodash/omit");
const config = require("../config");
const {
  createLastLoginFilterExpression,
} = require("../../utils/userSearchHelpers");
//Poc work
const { DefaultAzureCredential } = require("@azure/identity");
const { SearchClient } = require("@azure/search-documents");
const credential = new DefaultAzureCredential();

// const baseUri = `https://${config.search.azureSearch.serviceName}.search.windows.net/indexes`;
// const apiVersion = "2020-06-30";

const azureSearchClient = (indexName) => {
  return new SearchClient(`https://${config.cache.params.serviceName}.search.windows.net`, indexName ,credential);
};

const storeDocumentsInIndex = async (name, documents) =>
  asyncRetry(async () => {
    // const url = `${baseUri}/${name}/docs/index?api-version=${apiVersion}`;
    // const response = await fetch(url, {
    //   method: "POST",
    //   headers: {
    //     "content-type": "application/json",
    //     "api-key": config.search.azureSearch.apiKey,
    //   },
    //   body: JSON.stringify({
    //     value: documents,
    //   }),
    // });

    // if (response.status < 200 || response.status > 299) {
    //   throw new Error(
    //     `Request failed with status code ${response.status} (POST: ${url})`,
    //   );
    // }
    const response = await azureSearchClient(name).uploadDocuments([documents])

    return {
      statusCode: response._response.status,
      body: await response,
    };
  }, apiStrategy);

const deleteDocumentInIndex = async (name, id) => {

  const document = {
    id: id // Replace with the ID of the document you want to delete
  }

  await azureSearchClient(name).deleteDocuments([document])
  
  // await fetchApi(`${baseUri}/${name}/docs/index?api-version=${apiVersion}`, {
  //   method: "POST",
  //   headers: {
  //     "content-type": "application/json",
  //     "api-key": config.search.azureSearch.apiKey,
  //   },
  //   body: {
  //     value: [
  //       {
  //         "@search.action": "delete",
  //         id,
  //       },
  //     ],
  //   },
  // });
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
  const skip = (page - 1) * pageSize;
  //let uri = `${baseUri}/${name}/docs?api-version=${apiVersion}&search=${criteria}&$count=true&$skip=${skip}&$top=${pageSize}&queryType=full&searchMode=all`;
  //let orderBy = ""
  let filterParam = "";
  // if (sortBy) {
  //    orderBy = sortAsc ? sortBy : `${sortBy} desc`;
  //   //uri += `&$orderby=${orderBy}`;
  // }

  // if (searchFields) {
  //   uri += `&searchFields=${searchFields}`;
  // }

  if (filters) {
    //let filterParam = "";
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
    //uri += `&$filter=${filterParam}`;
  }
  const searchText = criteria; // Replace with your search text
  const options = {
    skip: skip,
    orderby: sortBy ? sortAsc ? sortBy : `${sortBy} desc` : "",
    searchFields: searchFields ? searchFields : "",
    filter: filterParam

    
  }
  const response = await azureSearchClient(name).search(searchText, options)

  // const response = await fetchApi(uri, {
  //   method: "GET",
  //   headers: {
  //     "content-type": "application/json",
  //     "api-key": config.search.azureSearch.apiKey,
  //   },
  // });
  let numberOfPages = 1;
  const totalNumberOfResults = parseInt(response.count, 10);
  if (!Number.isNaN(totalNumberOfResults)) {
    numberOfPages = Math.ceil(totalNumberOfResults / pageSize);
  }

  return {
    documents: response.map((x) => omit(x, ["@search.score"])),
    totalNumberOfResults,
    numberOfPages,
  };
};

module.exports = {
  storeDocumentsInIndex,
  searchIndex,
  deleteDocumentInIndex,
};
