function doCCSubmit() {
  console.log("doCCSubmit function called");
  var ccFrameRef = document.getElementById("ccFrame").contentWindow;
  console.log("ccFrameRef:", ccFrameRef);
  ccFrameRef.postMessage("tokenize", "https://esqa.moneris.com/HPPtoken/index.php");
  console.log("postMessage sent to ccFrameRef");
  return false;
}

var respMsg = function (e) {
  console.log("respMsg function called with event:", e);
  if (e.origin.includes('moneris.com')) {
    console.log("Origin includes moneris.com");
    var respData = eval("(" + e.data + ")");
    console.log("respData:", respData);
    var responseCode = respData.responseCode;
    console.log("responseCode:", responseCode);
    var message = "";
    switch (responseCode) {
      case "001": // 001
        console.log("Case 001: Setting data-key");
        $("#data-key").val(respData.dataKey);
        console.log("data-key set to:", respData.dataKey);
        //return true;
        //testing
        return false;
      case "943":
        message = "Card data is invalid.";
        console.log("Case 943:", message);
        break;
      case "944":
        message = "Invalid expiration date (MMYY, must be current month or in the future).";
        console.log("Case 944:", message);
        break;
      case "945":
        message = "Invalid CVD data (not 3-4 digits).";
        console.log("Case 945:", message);
        break;
      default:
        message = "Error saving credit card, please contact us hello@jack.org";
        console.log("Default case:", message);
    }

    $("#cc-error").text(message);
    console.log("cc-error text set to:", message);
    return false;
  } else {
    console.log("Origin does not include moneris.com");
  }
};

window.onload = function () {
  console.log("Window onload function called");
  if (window.addEventListener) {
    console.log("Adding event listener for 'message'");
    window.addEventListener("message", respMsg, false);
  } else if (window.attachEvent) {
    console.log("Attaching event 'onmessage'");
    window.attachEvent("onmessage", respMsg);
  }
};
$(document).ready(function() {
	$("#donate-form-submit").on("click", function () {
  		console.log("Donate form submit button clicked");
      	doCCSubmit();
    });
});
