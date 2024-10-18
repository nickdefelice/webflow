$(document).ready(function() {
  // Check if any donation form exists on the page
  if ($("[data-donate='complete-button']").length > 0) {
    let jwtToken = '';
    let isProcessing = false;

    // Function to get JWT token
    function getJWTToken() {
      console.log("getJWTToken: Initiating API call");
      return $.ajax({
        url: 'https://security.uat.akaraisin.com/api/authentication',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          organizationId: 196,
          subEventCustomPart: "testarnold"
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
      ccFrameRef.postMessage("tokenize", "https://esqa.moneris.com/HPPtoken/index.php");
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
            console.log("7. Data key set in form");
            // Get JWT token before formatting and submitting donation
            console.log("8. Initiating JWT token retrieval");
            getJWTToken()
              .then(function(response) {
                jwtToken = response;
                console.log("9. JWT Token successfully retrieved:", jwtToken);
                return formatAndSubmitDonation(window.currentDonationForm);
              })
              .then(function(donationResponse) {
                console.log("10. Donation submitted successfully:", donationResponse);
                // Handle successful donation
                window.currentDonationForm.submit();
                return true;
              })
              .catch(function(error) {
                console.error('11. Error in process:', error);
                let errorMessage = "We're experiencing technical difficulties. Please try again later.";
                
                // Check if the error response contains the specific payment declined message
                if (error && error.Exception && error.Exception.Message === "Payment declined.") {
                  errorMessage = "Your payment was declined. Please check your card details and try again, or use a different payment method.";
                }
                
                window.currentDonationForm.find("#cc-error").text(errorMessage).show();
                window.currentDonationForm.find('[data-donate="complete-button"]').prop('disabled', false);
                window.currentDonationForm.find('[data-donate="complete-button"] .btn_main_text').text('Donate');
                isProcessing = false;
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
            isProcessing = false;
        }
        window.currentDonationForm.find("#cc-error").text(message);
        window.currentDonationForm.find('[data-donate="complete-button"]').prop('disabled', false);
        window.currentDonationForm.find('[data-donate="complete-button"] .btn_main_text').text('Donate');
        isProcessing = false;
        return false;
      }
    };

    function formatAndSubmitDonation($form) {
      console.log("formatAndSubmitDonation: Starting");
      console.log("Current JWT Token:", jwtToken);
      
      const formFields = {
        dataKey: $form.find("#data-key").val(),
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
      const isDonatingOnBehalfOfCompany = $form.find('[data-donate="dedicate-this-donation"]').is(":checked");

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
          interfaceLanguage: 1, // 1 for en-ca, 2 for fr-ca
          correspondanceLanguage: 1, // 1 for en-ca, 2 for fr-ca
          receiveCommunications: false
        },
        paymentDetails: {
          paymentToken: formFields.dataKey,
          cardNumber: 0, // This should be masked or not included for security
          cardHolderName: formFields.cardholderName,
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

      console.log("JSON data to be submitted:", jsonData);
      return $.ajax({
        url: 'https://api.uat.akaraisin.com/v2/constituent',
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
      isProcessing = true;
      $(this).prop('disabled', true);
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

