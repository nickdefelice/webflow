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
        console.error('Error fetching JWT token:', error);
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
      const firstName = $("#name-3").val();
      const lastName = $("#name-4").val();
      const email = $("#email-3").val();
      const country = $("#Country-2").val();
      const address = $("#Address-2").val();
      const city = $("#City-2").val();
      const state = $("#State-2").val();
      const postCode = $("#Post-Code-2").val();
      const cardholderName = firstName + " " + lastName;
      const donationAmount = $("input[name='Amount']:checked").val();
      const frequency = $("input[name='Frequency']:checked").val();

      const jsonData = {
        profile: {
          address: {
            line1: address,
            line2: "",
            city: city,
            regionId: 30, // You may need to map this based on the selected state
            postalCode: postCode,
            countryId: 1 // You may need to map this based on the selected country
          },
          userId: 0,
          contactType: 0,
          title: "",
          firstName: firstName,
          lastName: lastName,
          email: email,
          organization: "",
          phone: "",
          gender: "",
          interfaceLanguage: 1,
          correspondanceLanguage: 1,
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
            type: 1,
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
            // Redirect to thank you page or show success message
          } else {
            // Handle failed donation
            console.error('Donation failed:', response);
            $("#cc-error").text("Donation failed. Please try again.").show();
          }
        },
        error: function(xhr, status, error) {
          console.error('Error submitting donation:', error);
          $("#cc-error").text("An error occurred. Please try again.").show();
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
