
var barcodeDetector;
var decoding = false;
var localStream;
var interval;
var scannerContainer = document.querySelector(".scanner");
var home = document.querySelector(".home");
var startButton = document.querySelector("#startButton");
startButton.onclick = function() {
  scannerContainer.style.display = "";
  home.style.display = "none";
  loadDevicesAndPlay();
}
var fileInput = document.querySelector("#fileInput")
fileInput.onchange = function(event) {
  var file = event.target.files[0];
  var reader = new FileReader();
				
  reader.onload = function(e){
    var img = document.getElementById("selectedImg");
    img.src = e.target.result;
    img.onload = async function() {
      var detectedCodes = await barcodeDetector.detect(img);
      var json = JSON.stringify(detectedCodes, null, 2);
      console.log(json);
      alert(json);
    }
  };
		
  reader.onerror = function () {
    console.warn('oops, something went wrong.');
  };
		
	reader.readAsDataURL(file);	
}

var closeButton = document.querySelector("#closeButton");
closeButton.onclick = function() {
  stop();
  scannerContainer.style.display = "none";
  home.style.display = "";
}
document.getElementsByClassName("camera")[0].addEventListener('loadeddata',onPlayed, false);
document.getElementById("cameraSelect").onchange = onCameraChanged;
initBarcodeDetector();


async function initBarcodeDetector(){
  var barcodeDetectorUsable = false;
  if ('BarcodeDetector' in window) {
    let formats = await window.BarcodeDetector.getSupportedFormats();
    if (formats.length > 0) {
      barcodeDetectorUsable = true;
    }
  }

  if (barcodeDetectorUsable === true) {
    alert('Barcode Detector supported!');
    barcodeDetector = new window.BarcodeDetector();
  }else{
    alert('Barcode Detector is not supported by this browser, using the Dynamsoft Barcode Reader polyfill.');
    barcodeDetector = new BarcodeDetectorPolyfill();
    BarcodeDetectorPolyfill.setLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==");
    let reader = await barcodeDetector.init();
    console.log(reader); // You can modify the runtime settings of the reader instance.
  }
  
  document.getElementById("status").innerHTML = "";
}

function loadDevicesAndPlay(){
  var constraints = {video: true, audio: false};
  navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      localStream = stream;
      var cameraselect = document.getElementById("cameraSelect");
      cameraselect.innerHTML="";
      navigator.mediaDevices.enumerateDevices().then(function(devices) {
          var count = 0;
          var cameraDevices = [];
          for (var i=0;i<devices.length;i++){
              var device = devices[i];
              if (device.kind == 'videoinput'){
                  cameraDevices.push(device);
                  var label = device.label || `Camera ${count++}`;
                  cameraselect.add(new Option(label,device.deviceId));
              }
          }

          if (cameraDevices.length>0) {
            play(cameraDevices[0].deviceId);
          }else{
            alert("No camera detected.");
          }
      });

  });
}

function play(deviceId, HDUnsupported) {
  stop();
  var constraints = {};

  if (!!deviceId){
      constraints = {
          video: {deviceId: deviceId},
          audio: false
      }
  }else{
      constraints = {
          video: true,
          audio: false
      }
  }

  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      localStream = stream;
      var camera = document.getElementsByClassName("camera")[0];
      // Attach local stream to video element
      camera.srcObject = stream;

  }).catch(function(err) {
      console.error('getUserMediaError', err, err.stack);
      alert(err.message);
  });
}

function stop(){
  clearInterval(interval);
  try{
      if (localStream){
          localStream.getTracks().forEach(track => track.stop());
      }
  } catch (e){
      alert(e.message);
  }
}

function onCameraChanged(){
  var cameraselect = document.getElementById("cameraSelect");
  var deviceId = cameraselect.selectedOptions[0].value;
  play(deviceId);
}

function onPlayed() {
  updateSVGViewBoxBasedOnVideoSize();
  startDecoding();
}

function updateSVGViewBoxBasedOnVideoSize(){
  var camera = document.getElementsByClassName("camera")[0];
  var svg = document.getElementsByTagName("svg")[0];
  svg.setAttribute("viewBox","0 0 "+camera.videoWidth+" "+camera.videoHeight);
}

function startDecoding(){
  clearInterval(interval);
  //1000/25=40
  interval = setInterval(decode, 500);
}

async function decode(){
  if (decoding === false) {
    console.log("decoding");
    var video = document.getElementsByClassName("camera")[0];
    decoding = true;
    var barcodes = await barcodeDetector.detect(video);
    decoding = false;
    console.log(barcodes);
    drawOverlay(barcodes);
  }
}

function drawOverlay(barcodes){
  var svg = document.getElementsByTagName("svg")[0];
  svg.innerHTML = "";
  for (var i=0;i<barcodes.length;i++) {
    var barcode = barcodes[i];
    console.log(barcode);
    var lr = {};
    lr.x1 = barcode.cornerPoints[0].x;
    lr.x2 = barcode.cornerPoints[1].x;
    lr.x3 = barcode.cornerPoints[2].x;
    lr.x4 = barcode.cornerPoints[3].x;
    lr.y1 = barcode.cornerPoints[0].y;
    lr.y2 = barcode.cornerPoints[1].y;
    lr.y3 = barcode.cornerPoints[2].y;
    lr.y4 = barcode.cornerPoints[3].y;
    var points = getPointsData(lr);
    var polygon = document.createElementNS("http://www.w3.org/2000/svg","polygon");
    polygon.setAttribute("points",points);
    polygon.setAttribute("class","barcode-polygon");
    var text = document.createElementNS("http://www.w3.org/2000/svg","text");
    text.innerHTML = barcode.rawValue;
    text.setAttribute("x",lr.x1);
    text.setAttribute("y",lr.y1);
    text.setAttribute("fill","red");
    text.setAttribute("fontSize","20");
    svg.append(polygon);
    svg.append(text);
  }
}

function getPointsData(lr){
  var pointsData = lr.x1+","+lr.y1 + " ";
  pointsData = pointsData+ lr.x2+","+lr.y2 + " ";
  pointsData = pointsData+ lr.x3+","+lr.y3 + " ";
  pointsData = pointsData+ lr.x4+","+lr.y4;
  return pointsData;
}
