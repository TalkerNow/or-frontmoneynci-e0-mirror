import mock from "../mock"
const users = [
  {
    id: 1,
    name: "Ruthe Champlin",
    email: "caden.johnston@example.com",
    email_verified_at: "2020-10-01T09:45:01.000000Z",
    created_at: "2020-10-01T09:45:01.000000Z",
    updated_at: "2020-10-01T09:45:01.000000Z",
    valid_account: 0,
    role: "user",
    personal_informations: {
      civility: "Dr.",
      first_name: "Glen",
      last_name: "Tromp",
      birth_date: "1978-04-29",
      martial_status: "repellendus",
      children_number: 265976,
      mobile_number: "(282) 837-1178 x98316",
      office_number: "1-525-471-3753",
      personal_address: "50084 Brady Turnpike\nRatkestad, IN 34079",
      personal_zip_code: 5683,
      personal_city: "North Maximus",
      personal_country: "Libyan Arab Jamahiriya",
      society_address: "375 Alva Square Apt. 116\nSouth Angelicastad, GA 94041-1291",
      society_zip_code: 46159,
      society_city: "Ashleighland",
      society_country: "Congo",
      user_id: 22,
      created_at: "2020-10-01T13:02:39.000000Z",
      updated_at: "2020-10-01T13:02:39.000000Z"
    }
  },
  {
    id: 1,
    name: "Ibo Akg",
    email: "stacy.walter@example.net",
    email_verified_at: "2020-09-25T13:19:47.000000Z",
    created_at: "2020-09-25T13:19:47.000000Z",
    updated_at: "2020-09-25T13:19:47.000000Z",
    valid_account: 0,
    role: "user"
  },
  {
    id: 2,
    name: "Vidal Marquardt",
    email: "stacy.walter@example.net",
    email_verified_at: "2020-09-25T13:19:47.000000Z",
    created_at: "2020-09-25T13:19:47.000000Z",
    updated_at: "2020-09-25T13:19:47.000000Z",
    valid_account: 1,
    role: "admin"
  }
]

// GET DATA
mock.onGet("/api/users/list").reply(200, users)