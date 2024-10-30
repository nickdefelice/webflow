$(document).ready(function() {
  // Check if any donation form exists on the page
  if ($("[data-donate='complete-button']").length > 0) {

    const AUTHENTICATION_URL = 'https://security.dm.akaraisin.com/api/authentication';
    const MONERIS_TOKEN_URL = 'https://www3.moneris.com/HPPtoken/index.php';
    const CONSTITUENT_API_URL = 'https://api.akaraisin.com/v2/constituent';
    const FALLBACK_DONATION_URL = 'https://jack.akaraisin.com/ui/donatenow';

    let jwtToken = '';
    let moneris_dataKey = '';
    let moneris_bin = '';
    let isProcessing = false;
    let isFrench = false;

    let organizationId = 196;
    let subEventCustomPart = "YE25W"; // Default value

    // Function to get URL parameters
    function getUrlParameter(name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    // Set subEventCustomPart based on utm_source
    const utmSource = getUrlParameter('utm_source');
    const utmSourceMapping = {
      '34705': 'YE25BRE',
      '34694': 'YE25W',
      '34700': 'YE25A',
      '34703': 'YE25DM',
      '34695': 'YE25M1',
      '34696': 'YE25M2',
      '34697': 'YE25M3',
      '34698': 'YE25M4'
    };

    if (utmSource && utmSourceMapping[utmSource]) {
      subEventCustomPart = utmSourceMapping[utmSource];
    }

    // Check if utm_id=fr is in the URL
    const utmId = getUrlParameter('utm_id');
    if (utmId === 'fr') {
      isFrench = true;
      subEventCustomPart += 'FR';
    }

    console.log("subEventCustomPart set to:", subEventCustomPart);

    // Function to get JWT token
    function getJWTToken() {
      console.log("getJWTToken: Initiating API call");
      return $.ajax({
        url: AUTHENTICATION_URL,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          organizationId: organizationId,
          subEventCustomPart: subEventCustomPart
        })
      }).then(function(response) {
        console.log("getJWTToken: API call successful", response);
        return response; // Return the entire response
      }).catch(function(error) {
        console.error("getJWTToken: API call failed", error);
        throw error;
      });
    }

    function doCCSubmit() {
      var ccFrameRef = document.getElementById("monerisFrame").contentWindow;
      ccFrameRef.postMessage("tokenize", MONERIS_TOKEN_URL);
      return false;
    }

    var respMsg = function (e) {
      if (e.origin.includes('moneris.com')) {
        console.log("4. Received message from Moneris");
        var respData = JSON.parse(e.data);
        var responseCode = Array.isArray(respData.responseCode) ? respData.responseCode[0] : respData.responseCode;
        console.log("5. Moneris response code:", responseCode);
        var message = "";
        switch (responseCode) {
          case "001": // 001
            console.log("6. Successful Moneris token received");
            window.currentDonationForm.find("#data-key").val(respData.dataKey);
            moneris_dataKey = respData.dataKey;
            moneris_bin = respData.bin;
            console.log("7. Data key set in form");
            // Get JWT token before formatting and submitting donation
            console.log("8. Initiating JWT token retrieval");
            getJWTToken()
              .then(function(response) {
                jwtToken = response;
                console.log("9. JWT Token successfully retrieved:", jwtToken);
                return formatAndSubmitDonation(window.currentDonationForm, moneris_dataKey, moneris_bin);
              })
              .then(function(donationResponse) {
                console.log("10. Donation submitted successfully:", donationResponse);
                // Handle successful donation
                window.currentDonationForm.submit();
                return true;
              })
              .catch(function(error) {
                console.error('11. Error in process:', error);
                let errorMessage = "We're experiencing technical difficulties. Please try to donate at " + FALLBACK_DONATION_URL;
                
                // Check if the error response contains the specific payment declined message
                if (error && error.Exception && error.Exception.Message === "Payment declined.") {
                  errorMessage = "Your payment was declined. Please check your card details and try again, or use a different payment method.";
                }
                
                window.currentDonationForm.find("#cc-error").text(errorMessage).show();
                window.currentDonationForm.find('[data-donate="complete-button"]').prop('disabled', false);
                window.currentDonationForm.find('[data-donate="complete-button"] .btn_main_text').text('Donate');
                toggleProcessing(false);
              });
            return false;
          case "943":
            message = "Card data is invalid.";
            break;
          case "944":
            message = "Invalid expiration date (MMYY, must be a future date).";
            break;
          case "945":
            message = "Invalid CVD data (not 3-4 digits).";
            break;
          default:
            message = "Error saving credit card, please contact us hello@jack.org";
            console.log("6. Error in Moneris response:", message);
            // Re-enable the button and reset text
            window.currentDonationForm.find('[data-donate="complete-button"]').prop('disabled', false);
            window.currentDonationForm.find('[data-donate="complete-button"] .btn_main_text').text('Donate');
            toggleProcessing(false);
        }
        window.currentDonationForm.find("#cc-error").text(message);
        window.currentDonationForm.find('[data-donate="complete-button"]').prop('disabled', false);
        window.currentDonationForm.find('[data-donate="complete-button"] .btn_main_text').text('Donate');
        toggleProcessing(false);
        return false;
      }
    };

    function formatAndSubmitDonation($form, moneris_dataKey, moneris_bin) {
      console.log("formatAndSubmitDonation: Starting");
      console.log("Current JWT Token:", jwtToken);
      
      const formFields = {
        firstName: $form.find('[data-donate="first-name"]').val(),
        lastName: $form.find('[data-donate="last-name"]').val(),
        email: $form.find('[data-donate="email"]').val(),
        phone: $form.find('[data-donate="phone"]').val(),
        countryId: $form.find('[data-donate="country"]').val(),
        address: $form.find('[data-donate="address"]').val(),
        city: $form.find('[data-donate="city"]').val(),
        regionId: $form.find('[data-donate="region"]').val(),
        postCode: $form.find('[data-donate="post-code"]').val(),
        organization: $form.find('[data-donate="company-name"]').val(),
        cardholderName: $form.find('[data-donate="cardholder-name"]').val()
      };

      // Trim all values
      Object.keys(formFields).forEach(key => {
        if (typeof formFields[key] === 'string') {
          formFields[key] = formFields[key].trim();
        }
      });

      let donationAmount;
      
      const selectedAmount = $form.find('[data-donate="amount"] input:checked').val().trim();
      if (selectedAmount === 'Other') {
        donationAmount = $form.find('[data-donate="other-amount"]').val().trim().replace('$', '');
      } else {
        donationAmount = selectedAmount.replace('$', '');
      }
      
      const frequency = $form.find('[data-donate="frequency"] input:checked').val().toLowerCase().trim();
      const inHonour = $form.find('[data-donate="dedicate-this-donation"] input[type=checkbox]').is(":checked");
      const inMemory = $form.find('[data-donate="dedicate-in-memory"] input[type=checkbox]').is(":checked");
      const isDedicatedDonation = inHonour || inMemory;
      const isDonatingOnBehalfOfCompany = $form.find('[data-donate="donate-company"] input[type=checkbox]').is(":checked");
      const isAdminFee = $form.find('[data-donate="admin-cost"] input[type=checkbox]').is(":checked");
      const optOutOfCommunications = $form.find('[data-donate="opt-out"] input[type=checkbox]').is(":checked");
      const isAnonymousDonation = $form.find('[data-donate="donate-anonymously"] input[type=checkbox]').is(":checked");
      const donationType = (() => {
        if (isDedicatedDonation) {
          switch (frequency) {
            case 'one-time': return inMemory ? 3 : 2;   // In Memory or In Honour Donation
            case 'monthly': return inMemory ? 12 : 7;   // In Memory or In Honour Monthly
            case 'quarterly': return inMemory ? 21 : 9; // In Memory or In Honour Quarterly
            case 'annual': return inMemory ? 22 : 10;   // In Memory or In Honour Annual
            default: return inMemory ? 3 : 2;           // Default to One-time
          }
        } else {
          switch (frequency) {
            case 'one-time': return 1;   // General Donation
            case 'monthly': return 4;     // General Monthly
            case 'quarterly': return 5;   // General Quarterly
            case 'annual': return 6;      // General Annual
            default: return 1;            // Default to General Donation
          }
        }
      })();

      const jsonData = {
        profile: {
          address: {
            line1: formFields.address,
            line2: "",
            city: formFields.city,
            regionId: parseInt(formFields.regionId, 10),
            postalCode: formFields.postCode,
            countryId: parseInt(formFields.countryId, 10)
          },
          userId: 0, // Always send userId as '0'
          contactType: isDonatingOnBehalfOfCompany ? 1 : 0, // 0 for individual, 1 for company representative
          title: "",
          firstName: formFields.firstName,
          lastName: formFields.lastName,
          email: formFields.email,
          organization: isDonatingOnBehalfOfCompany ? formFields.organization : "", // Fill with organization name if donating as company representative
          phone: formFields.phone,
          gender: "",
          interfaceLanguage: isFrench ? 2 : 1, 
          correspondanceLanguage: isFrench ? 2 : 1, 
          receiveCommunications: !optOutOfCommunications,
          allowDistributionOfDetails: isAnonymousDonation,
        },
        paymentDetails: {
          paymentToken: moneris_dataKey,
          cardNumber: moneris_bin,
          cardHolderName: formFields.cardholderName,
          cardType:0, // Determine card type based on BIN
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
            type: donationType,
            quantity: 1,
            donationAmount: parseFloat(donationAmount),
            fundId: 10444,
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

      // Add admin fee item if applicable
      let adminFeeAmount = 0;
      if (isAdminFee) {
        adminFeeAmount = parseFloat(donationAmount) * 0.02;
        adminFeeAmount = Math.min(adminFeeAmount, 5.00);
        adminFeeAmount = Math.round(adminFeeAmount * 100) / 100;
      }
      if (isAdminFee && adminFeeAmount > 0) {
        jsonData.purchaseItems.push({
          promoCode: null,
          itemId: 0,
          typeLabel: "AdminFee",
          category: "Admin Fee",
          category2: "",
          category3: "",
          registrationFee: 0,
          minFundRaisingGoal: 0,
          suggestedFundRaisingGoal: 0,
          name: "",
          adminFeeAmount: adminFeeAmount,
          type: 29,
          $type: "AdminFeeItem"
        });
      }

      // Handle dedicated donation
      if (isDedicatedDonation) {
          const honoreeName = $form.find('[data-donate="honore-name"]').val();
          const [firstName, ...lastNameParts] = honoreeName.split(' ');
          const lastName = lastNameParts.join(' ');

          if (firstName && firstName.trim()) {
              jsonData.purchaseItems[0].tribute = {
                  firstName: firstName,
                  lastName: lastName
              };
          }
      }

      console.log("JSON data to be submitted:", jsonData);
      return $.ajax({
        url: CONSTITUENT_API_URL,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + jwtToken,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(jsonData)
      }).then(function(response) {
        console.log("formatAndSubmitDonation: API call response", response);
        
        // Parse the response if it's a string
        let parsedResponse = response;
        if (typeof response === 'string') {
          try {
            parsedResponse = JSON.parse(response);
          } catch (e) {
            console.error("Error parsing response:", e);
            throw new Error("Invalid response format");
          }
        }
        
        console.log("Parsed response:", parsedResponse);
        console.log("Success value:", parsedResponse.Success);
        console.log("Type of Success value:", typeof parsedResponse.Success);
        
        if (parsedResponse.Success === true) {
          console.log('10. Donation submitted successfully:', parsedResponse);
          return parsedResponse;
        } else {
          console.error('Donation failed:', parsedResponse);
          throw new Error('Donation failed: ' + JSON.stringify(parsedResponse));
        }
      }).catch(function(error) {
        console.error('Error submitting donation:', error);
        throw error;
      });
    }

    // Add this new function
    function toggleProcessing(state) {
      isProcessing = state;
      if (state) {
        $("body").addClass("form-submitting");
      } else {
        $("body").removeClass("form-submitting");
      }
    }

    // Event listener for the donate button
    $(document).on("click", '[data-donate="complete-button"]', function (e) {
      e.preventDefault();
      
      if (isProcessing) {
        console.log("Donation already in progress. Ignoring click.");
        return;
      }
      
      console.log("1. Donate button clicked");
      
      // Get the form that contains the clicked button
      const $form = $(this).closest('form');
      
      // Disable the button and change its text
      $(this).prop('disabled', true);
      toggleProcessing(true);
      $form.find('[data-donate="complete-button"] .btn_main_text').text('Processing...');
      console.log("2. Button disabled and text changed to 'Processing...'");
      
      // Store the form for later use
      window.currentDonationForm = $form;
      
      doCCSubmit();
      console.log("3. doCCSubmit() called");
    });

    // Add the event listener for the Moneris response
    if (window.addEventListener) {
      window.addEventListener("message", respMsg, false);
    } else if (window.attachEvent) {
      window.attachEvent("onmessage", respMsg);
    }
  }
  
});
