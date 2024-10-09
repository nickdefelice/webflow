$(document).ready(function() {
// Check if the donation form exists on the page
  if ($("#wf-form-Donation-Form").length > 0) {
    let jwtToken = '';

    // Function to get JWT token
    function getJWTToken() {
      return $.ajax({
        url: 'https://security.uat.akaraisin.com/api/authentication',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          organizationId: 196,
          subEventCustomPart: "canadasgreatlakecrossing"
        })
      }).then(function(response) {
        jwtToken = response.access_token;
      }).catch(function(error) {
        console.error('Error fetching JWT token.');
      });
    }

    // Get JWT token when page loads
    getJWTToken();

    function doCCSubmit() {
      var ccFrameRef = document.getElementById("ccFrame").contentWindow;
      ccFrameRef.postMessage("tokenize", "https://esqa.moneris.com/HPPtoken/index.php");
      return false;
    }

    var respMsg = function (e) {
      if (e.origin.includes('moneris.com')) {
        var respData = JSON.parse(e.data);
        var responseCode = Array.isArray(respData.responseCode) ? respData.responseCode[0] : respData.responseCode;
        var message = "";
        switch (responseCode) {
          case "001": // 001
            $("#data-key").val(respData.dataKey);
            formatAndSubmitDonation();
            return false;
          case "943":
            message = "Card data is invalid.";
            break;
          case "944":
            message = "Invalid expiration date (MMYY, must be current month or in the future).";
            break;
          case "945":
            message = "Invalid CVD data (not 3-4 digits).";
            break;
          default:
            message = "Error saving credit card, please contact us hello@jack.org";
        }

        $("#cc-error").text(message);
        return false;
      }
    };

    function formatAndSubmitDonation() {
      const dataKey = $("#data-key").val();
      const titleName = $("#donate-title-2").val().trim();
      const firstName = $("#Donate-First-Name").val().trim();
      const lastName = $("#Donate-Last-Name").val().trim();
      const email = $("#Donate-Email-Address").val().trim();
      const phone = $("#Donate-Phone").val().trim();
      const country = $("#Donate-Country").val().trim();
      const address = $("#Donate-Address").val().trim();
      const city = $("#Donate-City").val().trim();
      const state = $("#Region").val().trim();
      const postCode = $("#Donate-Post-Code").val().trim();
      const cardholderName = firstName + " " + lastName;
      const donationAmount = $("input[name='Amount']:checked").val().trim().replace('$', '');
      const frequency = $("input[name='Frequency']:checked").val().toLowerCase().trim();
      const isDonatingOnBehalfOfCompany = $("#Donating-on-behalf-of-a-company-2").is(":checked");
      const organization = $("#Donate-company-name").val().trim();

      const countryId = getCountryId(country);
      const regionId = getRegionId(state, countryId);

      const jsonData = {
        profile: {
          address: {
            line1: address,
            line2: "",
            city: city,
            regionId: parseInt(regionId, 10),
            postalCode: postCode,
            countryId: parseInt(countryId, 10)
          },
          userId: 0, // Always send userId as '0'
          contactType: isDonatingOnBehalfOfCompany ? 1 : 0, // 0 for individual, 1 for company representative
          title: titleName,
          firstName: firstName,
          lastName: lastName,
          email: email,
          organization: isDonatingOnBehalfOfCompany ? organization : "", // Fill with organization name if donating as company representative
          phone: phone,
          gender: "",
          interfaceLanguage: 1, // 1 for en-ca, 2 for fr-ca
          correspondanceLanguage: 1, // 1 for en-ca, 2 for fr-ca
          receiveCommunications: false
        },
        paymentDetails: {
          paymentToken: dataKey,
          cardNumber: 0, // This should be masked or not included for security
          cardHolderName: cardholderName,
          cardType: 2, // You may need to determine this based on the card number
          paymentMethod: 0,
          payPalToken: "",
          payPalPayerId: "",
          payPalTotalAmount: 0,
          payPalCurrency: "",
          isVisaCheckOutAllowed: false,
          reCaptchaError: ""
        },
        purchaseItems: [
          {
            promoCode: null,
            itemId: 0,
            typeLabel: "Donation",
            category: "Donation",
            category2: "",
            category3: "",
            registrationFee: 0,
            minFundRaisingGoal: 0,
            suggestedFundRaisingGoal: 0,
            name: "",
            type: frequency === "one-time" ? 1 : frequency === "monthly" ? 4 : frequency === "quarterly" ? 5 : frequency === "annual" ? 6 : 1, // 1: one time, 4: monthly, 5: quarterly, 6: annual
            quantity: 1,
            donationAmount: parseFloat(donationAmount),
            otherFundName: "",
            tribute: null,
            eventTypeId: 11,
            $type: "GeneralDonationItem",
            isSelfDonation: false
          }
        ],
        surveys: [],
        returningUserId: null,
        importSubEventId: null
      };

      $.ajax({
        url: 'https://api.uat.akaraisin.com/v2/constituent',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + jwtToken,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(jsonData),
        success: function(response) {
          if (response.Success) {
            // Handle successful donation
            console.log('Donation successful:', response);
            
            // Extract relevant information from the response
            const eventName = response.Result && response.Result.EventName ? response.Result.EventName : 'Unknown Event';
            const txAmount = response.Result && response.Result.Transaction && response.Result.Transaction.TxAmount ? response.Result.Transaction.TxAmount : 0;
            
            // Create a simplified success message
            const successMessage = `
              <h2>Thank you for your donation! Your donation has been successfully processed.</p>
              <p>We appreciate your support!</p>
            `;
            
            // Display the success message
            $("#donation-form-container").html(successMessage);
            
            // Optionally, you can scroll to the success message
            $('html, body').animate({
              scrollTop: $("#donation-form-container").offset().top
            }, 1000);
            
            // Google Analytics event tracking
            if (typeof ga !== 'undefined') {
              ga('send', 'event', 'Donation', 'Success', eventName, txAmount);
            }
          } else {
            // Handle failed donation
            console.error('Donation failed:', response);
            $("#cc-error").text("We're sorry, but your donation could not be processed at this time. Please try again later or contact our support team for assistance.").show();
          }
        },
        error: function(xhr, status, error) {
          console.error('Error submitting donation:', error);
          $("#cc-error").text("We're experiencing technical difficulties. Please try again later or contact our support team for assistance.").show();
        }
      });
    }

    // Event listener for the donate button
    $("#donate-form-submit").on("click", function (e) {
      e.preventDefault();
      doCCSubmit();
    });

    // Add the event listener for the Moneris response
    if (window.addEventListener) {
      window.addEventListener("message", respMsg, false);
    } else if (window.attachEvent) {
      window.attachEvent("onmessage", respMsg);
    }
  }
  
});

// Add this function at the bottom of the file
function getCountryId(countryName) {
  const countryMap = {
    "Canada": "1",
    "United States": "2",
    "Afghanistan": "3",
    "Albania": "4",
    "Algeria": "5",
    "American Samoa": "6",
    "Andorra": "7",
    "Angola": "8",
    "Anguilla": "9",
    "Antarctica": "10",
    "Antigua": "11",
    "Argentina": "12",
    "Armenia": "13",
    "Aruba": "14",
    "Australia": "15",
    "Austria": "16",
    "Azerbaijan": "17",
    "Bahamas": "18",
    "Bahrain": "19",
    "Bangladesh": "20",
    "Barbados": "21",
    "Belarus": "22",
    "Belgium": "23",
    "Belize": "24",
    "Benin": "25",
    "Bermuda": "26",
    "Bhutan": "27",
    "Bolivia": "28",
    "Bosnia and Herzegovina": "29",
    "Botswana": "30",
    "Bouvet Island": "31",
    "Brazil": "32",
    "British Indian Ocean Territory": "33",
    "British Virgin Islands": "34",
    "Brunei Darussalam": "35",
    "Bulgaria": "36",
    "Burkina Faso": "37",
    "Burundi": "38",
    "Cambodia": "39",
    "Cameroon": "40",
    "Cape Verde": "41",
    "Cayman Islands": "42",
    "Central African": "43",
    "Chad": "44",
    "Chile": "45",
    "China": "46",
    "Christmas Island": "47",
    "Cocos Islands": "48",
    "Colombia": "49",
    "Comoros": "50",
    "Cook Islands": "53",
    "Costa Rica": "54",
    "Cote D'Ivoire": "55",
    "Croatia": "98",
    "Cuba": "56",
    "Cyprus": "57",
    "Czech": "58",
    "Democratic Republic of Congo": "51",
    "Denmark": "59",
    "Djibouti": "60",
    "Dominica": "61",
    "Dominican": "62",
    "Ecuador": "63",
    "Egypt": "64",
    "El Salvador": "65",
    "Equatorial Guinea": "66",
    "Eritrea": "67",
    "Estonia": "68",
    "Ethiopia": "69",
    "Faeroe Islands": "70",
    "Falkland Islands": "71",
    "Fiji": "72",
    "Finland": "73",
    "France": "74",
    "French Guiana": "75",
    "French Polynesia": "76",
    "French Southern Territories": "77",
    "Gabon": "78",
    "Gambia": "79",
    "Georgia": "80",
    "Germany": "81",
    "Ghana": "82",
    "Gibraltar": "83",
    "Greece": "84",
    "Greenland": "85",
    "Grenada": "86",
    "Guadaloupe": "87",
    "Guam": "88",
    "Guatemala": "89",
    "Guinea": "90",
    "Guinea-Bissau": "91",
    "Guyana": "92",
    "Haiti": "93",
    "Heard and McDonald Islands": "94",
    "Holy See": "95",
    "Honduras": "96",
    "Hong Kong": "97",
    "Hungary": "99",
    "Iceland": "100",
    "India": "101",
    "Indonesia": "102",
    "Iran": "103",
    "Iraq": "104",
    "Ireland": "105",
    "Israel": "106",
    "Italy": "107",
    "Jamaica": "108",
    "Japan": "109",
    "Jordan": "110",
    "Kazakhstan": "111",
    "Kenya": "112",
    "Kiribati": "113",
    "Kuwait": "116",
    "Kyrgyz": "117",
    "Lao": "118",
    "Latvia": "119",
    "Lebanon": "120",
    "Lesotho": "121",
    "Liberia": "122",
    "Libyan Arab Jamahiriya": "123",
    "Liechtenstein": "124",
    "Lithuania": "125",
    "Luxembourg": "126",
    "Macao": "127",
    "Macedonia": "128",
    "Madagascar": "129",
    "Malawi": "130",
    "Malaysia": "131",
    "Maldives": "132",
    "Mali": "133",
    "Malta": "134",
    "Marshall Islands": "135",
    "Martinique": "136",
    "Mauritania": "137",
    "Mauritius": "138",
    "Mayotte": "139",
    "Mexico": "140",
    "Micronesia": "141",
    "Moldova": "142",
    "Monaco": "143",
    "Mongolia": "144",
    "Montserrat": "145",
    "Morocco": "146",
    "Mozambique": "147",
    "Myanmar": "148",
    "Namibia": "149",
    "Nauru": "150",
    "Nepal": "151",
    "Netherlands": "153",
    "Netherlands Antilles": "152",
    "New Caledonia": "154",
    "New Zealand": "155",
    "Nicaragua": "156",
    "Niger": "157",
    "Nigeria": "158",
    "Niue": "159",
    "Norfolk Island": "160",
    "North Korea": "114",
    "Northern Mariana Islands": "161",
    "Norway": "162",
    "Oman": "163",
    "Pakistan": "164",
    "Palau": "165",
    "Palestinian Territory": "166",
    "Panama": "167",
    "Papua New Guinea": "168",
    "Paraguay": "169",
    "People's Republic of Congo": "52",
    "Peru": "170",
    "Philippines": "171",
    "Pitcairn Island": "172",
    "Poland": "173",
    "Portugal": "174",
    "Puerto Rico": "175",
    "Qatar": "176",
    "Reunion": "177",
    "Romania": "178",
    "Russian Federation": "179",
    "Rwanda": "180",
    "Samoa": "181",
    "San Marino": "182",
    "Sao Tome and Principe": "183",
    "Saudi Arabia": "184",
    "Senegal": "185",
    "Serbia and Montenegro": "186",
    "Seychelles": "187",
    "Sierra Leone": "188",
    "Singapore": "189",
    "Slovakia": "190",
    "Slovenia": "191",
    "Solomon Islands": "192",
    "Somalia": "193",
    "South Africa": "194",
    "South Georgia and the South Sandwich Islands": "195",
    "South Korea": "115",
    "Spain": "196",
    "Sri Lanka": "197",
    "St. Helena": "198",
    "St. Kitts and Nevis": "199",
    "St. Lucia": "200",
    "St. Pierre and Miquelon": "201",
    "St. Vincent and the Grenadines": "202",
    "Sudan": "203",
    "Suriname": "204",
    "Svalbard & Jan Mayen Islands": "205",
    "Swaziland": "206",
    "Sweden": "207",
    "Switzerland": "208",
    "Syrian Arab": "209",
    "Taiwan": "210",
    "Tajikistan": "211",
    "Tanzania": "212",
    "Thailand": "213",
    "Timor-Leste": "214",
    "Togo": "215",
    "Tokelau": "216",
    "Tonga": "217",
    "Trinidad and Tobago": "218",
    "Tunisia": "219",
    "Turkey": "220",
    "Turkmenistan": "221",
    "Turks and Caicos Islands": "222",
    "Tuvalu": "223",
    "Uganda": "224",
    "Ukraine": "225",
    "United Arab Emirates": "226",
    "United Kingdom of Great Britain & N. Ireland": "227",
    "United States Minor Outlying Islands": "228",
    "Uruguay": "229",
    "US Virgin Islands": "230",
    "Uzbekistan": "231",
    "Vanuatu": "232",
    "Venezuela": "233",
    "Viet Nam": "234",
    "Wallis and Futuna Islands": "235",
    "Western Sahara": "236",
    "Yemen": "237",
    "Zambia": "238",
    "Zimbabwe": "239"
  };

  return countryMap[countryName] || "1"; // Default to Canada (1) if not found
}

// Add this function at the bottom of the file
function getRegionId(regionName, countryId) {
  const regionMap = [
    { text: "Alabama", value: "3", countryId: 2 },
    { text: "Alaska", value: "2", countryId: 2 },
    { text: "Alberta", value: "1", countryId: 1 },
    { text: "Arizona", value: "5", countryId: 2 },
    { text: "Arkansas", value: "4", countryId: 2 },
    { text: "British Columbia", value: "6", countryId: 1 },
    { text: "California", value: "7", countryId: 2 },
    { text: "Colorado", value: "8", countryId: 2 },
    { text: "Connecticut", value: "9", countryId: 2 },
    { text: "D.C.", value: "301", countryId: 2 },
    { text: "Delaware", value: "10", countryId: 2 },
    { text: "Florida", value: "11", countryId: 2 },
    { text: "Georgia", value: "12", countryId: 2 },
    { text: "Hawaii", value: "13", countryId: 2 },
    { text: "Idaho", value: "15", countryId: 2 },
    { text: "Illinois", value: "16", countryId: 2 },
    { text: "Indiana", value: "17", countryId: 2 },
    { text: "Iowa", value: "14", countryId: 2 },
    { text: "Kansas", value: "18", countryId: 2 },
    { text: "Kentucky", value: "19", countryId: 2 },
    { text: "Louisiana", value: "20", countryId: 2 },
    { text: "Maine", value: "24", countryId: 2 },
    { text: "Manitoba", value: "22", countryId: 1 },
    { text: "Maryland", value: "23", countryId: 2 },
    { text: "Massachusetts", value: "21", countryId: 2 },
    { text: "Michigan", value: "25", countryId: 2 },
    { text: "Minnesota", value: "26", countryId: 2 },
    { text: "Mississippi", value: "28", countryId: 2 },
    { text: "Missouri", value: "27", countryId: 2 },
    { text: "Montana", value: "29", countryId: 2 },
    { text: "Nebraska", value: "33", countryId: 2 },
    { text: "Nevada", value: "41", countryId: 2 },
    { text: "New Brunswick", value: "30", countryId: 1 },
    { text: "New Hampshire", value: "35", countryId: 2 },
    { text: "New Jersey", value: "36", countryId: 2 },
    { text: "New Mexico", value: "37", countryId: 2 },
    { text: "New York", value: "42", countryId: 2 },
    { text: "Newfoundland and Labrador", value: "34", countryId: 1 },
    { text: "North Carolina", value: "31", countryId: 2 },
    { text: "North Dakota", value: "32", countryId: 2 },
    { text: "Northwest Territories", value: "39", countryId: 1 },
    { text: "Nova Scotia", value: "38", countryId: 1 },
    { text: "Nunavut", value: "40", countryId: 1 },
    { text: "Ohio", value: "43", countryId: 2 },
    { text: "Oklahoma", value: "44", countryId: 2 },
    { text: "Ontario", value: "45", countryId: 1 },
    { text: "Oregon", value: "46", countryId: 2 },
    { text: "Pennsylvania", value: "47", countryId: 2 },
    { text: "Prince Edward Island", value: "48", countryId: 1 },
    { text: "Quebec", value: "49", countryId: 1 },
    { text: "Rhode Island", value: "50", countryId: 2 },
    { text: "Saskatchewan", value: "53", countryId: 1 },
    { text: "South Carolina", value: "51", countryId: 2 },
    { text: "South Dakota", value: "52", countryId: 2 },
    { text: "Tennessee", value: "54", countryId: 2 },
    { text: "Texas", value: "55", countryId: 2 },
    { text: "Utah", value: "56", countryId: 2 },
    { text: "Vermont", value: "58", countryId: 2 },
    { text: "Virginia", value: "57", countryId: 2 },
    { text: "Washington", value: "59", countryId: 2 },
    { text: "West Virginia", value: "61", countryId: 2 },
    { text: "Wisconsin", value: "60", countryId: 2 },
    { text: "Wyoming", value: "62", countryId: 2 },
    { text: "Yukon", value: "63", countryId: 1 }
  ];

  const region = regionMap.find(r => r.text.toLowerCase() === regionName.toLowerCase() && r.countryId === parseInt(countryId));
  
  if (region) {
    return parseInt(region.value, 10);
  } else {
    // If the region is not found, return the "All Regions" value for the given country
    const allRegions = regionMap.find(r => r.text === "All Regions" && r.countryId === parseInt(countryId));
    return allRegions ? parseInt(allRegions.value, 10) : 64; // Default to 64 (All Regions for the first country) if not found
  }
}
