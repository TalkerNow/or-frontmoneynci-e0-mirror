const API_URL =
  process.env.REACT_APP_API_URL || "https://api.optionretraite.net/api"

module.exports = global.config = {
//   server_url: "http://localhost:8000/api",
//   server_url: "http://vps-a1b847f6.vps.ovh.net:8080/api"
    // server_url: "https://api.optionretraite.net/api"
    // server_url: "http://146.59.144.62:8081/api"
	server_url: API_URL
//   other global config variables you wish
};
