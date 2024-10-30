# webflow


# Test Locally

`python3 -m http.server`
`ngrok http 8000`


# UAT
const AUTHENTICATION_URL = 'https://security.uat.akaraisin.com/api/authentication';
const MONERIS_TOKEN_URL = 'https://esqa.moneris.com/HPPtoken/index.php';
const CONSTITUENT_API_URL = 'https://api.uat.akaraisin.com/v2/constituent';
const FALLBACK_DONATION_URL = 'https://jack.akaraisin.com/ui/donatenow';

Authentication
"organizationId": 196,
"subEventCustomPart": "testarnold"


#Prod
const AUTHENTICATION_URL = 'https://security.dm.akaraisin.com/api/authentication';
const MONERIS_TOKEN_URL = 'https://www3.moneris.com/HPPtoken/index.php';
const CONSTITUENT_API_URL = 'https://api.akaraisin.com/v2/constituent';
const FALLBACK_DONATION_URL = 'https://jack.akaraisin.com/ui/donatenow';


Authentication
{
  "organizationId": 196,
  "subEventCustomPart": "YE25W"
}


# Purchase Item Types
| Value | Description                | Frequency | Gift Type |
|-------|----------------------------|-----------|-----------|
| 1     | General Donation           | One-Time  | General   |
| 2     | In Honour Donation         | One-Time  | Tribute   |
| 3     | In Memory Donation         | One-Time  | Tribute   |
| 4     | General Donation - Monthly | Monthly   | General   |
| 5     | General Donation - Quarterly | Quarterly | General   |
| 6     | General Donation - Annual  | Annually  | General   |
| 7     | In Honour - Monthly        | Monthly   | Tribute   |
| 9     | In Honour - Quarterly      | Quarterly | Tribute   |
| 10    | In Honour - Annual         | Annually  | Tribute   |
| 12    | In Memory - Monthly        | Monthly   | Tribute   |
| 21    | In Memory - Quarterly      | Quarterly | Tribute   |
| 22    | In Memory - Annual         | Annually  | Tribute   |
| 29    | Admin Fee                  | -         | Admin Fee |

I'd like to cover the admin fee for this donation so more can go to the cause
Tim: Similarly, the optional admin is a separate purchase item, so in your request include another purchase item where type = 29. This can be sent with any Donation, In Honour or In Memory item type.

ToDo: 
- Add in memory and in honour donation types to the donation type dropdown
- Add reciept # to the thank you page

