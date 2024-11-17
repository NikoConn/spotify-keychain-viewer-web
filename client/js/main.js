import * as THREE from "../lib/three.js";
import { STLLoader } from "../lib/STLLoader.js";

var scene, renderer, camera;
var keychain, codeMesh, rectangleMesh;
var leftLight, rightLight, base, floor, wall, backLight;
var url, status;
var stopUserMovingTimeout;
var currentZip;

const loader = new STLLoader();

const urlInput = document.getElementById("urlInput");
const canvas = document.getElementById("canvas");
const downloadButton = document.getElementById("downloadButton");
const codeColorSelector = document.getElementById("codeColor");
const rectangleColorSelector = document.getElementById("rectangleColor");

async function load_file_mesh(file) {
  const data = await file.async("arraybuffer");

  const geometry = loader.parse(data);
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  return mesh;
}

async function get_stl(url, callback) {
  const objectContainer = new THREE.Object3D();
  const [x, y] = [-50, 30];

  const postData = {
    url: url,
  };

  const response = await fetch("https://spotify-keychain-viewer-web-ngnicog2032-o3k188up.leapcell.dev:8080/spotify-stl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  });
  currentZip = await response.blob();
  const zip = await JSZip.loadAsync(currentZip);

  codeMesh = await load_file_mesh(zip.files["codes.stl"]);
  codeMesh.material.color.set(codeColorSelector.value);
  codeMesh.position.set(x, y, 0);

  rectangleMesh = await load_file_mesh(zip.files["rectangle.stl"]);
  rectangleMesh.material.color.set(rectangleColorSelector.value);
  rectangleMesh.position.set(x, y, 0);

  objectContainer.add(codeMesh);
  objectContainer.add(rectangleMesh);

  callback(objectContainer);
}

function init() {
  get_stl(url, function (data) {
    keychain = data;

    initGraphics();
    initScenario();
    initObjects();
    animate();
  });
}

function initGraphics() {
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

  canvas.innerHTML = "";
  canvas.appendChild(renderer.domElement);

  //camara
  camera = new THREE.PerspectiveCamera(
    27,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.z = -300;
  camera.position.y = 75;
  camera.lookAt(0, 40, 0);

  //lights
  const side = 100;

  leftLight = new THREE.DirectionalLight(leftLight, 0.01);
  leftLight.position.set(150, 75, -200);
  leftLight.target.position.set(0, 200, 0);
  leftLight.color.setHex(0xffffff);
  leftLight.castShadow = true;
  leftLight.shadow.camera.top = side;
  leftLight.shadow.camera.left = -side;
  leftLight.shadow.camera.right = side;
  leftLight.shadow.camera.bottom = -side;
  scene.add(leftLight);

  rightLight = new THREE.DirectionalLight(rightLight, 0.01);
  rightLight.position.set(-150, 75, -200);
  rightLight.target.position.set(0, 200, 0);
  rightLight.color.setHex(0x000000);
  scene.add(rightLight);

  //backlight
  backLight = new THREE.PointLight(0xffffff, 15, 35);
  backLight.position.set(0, 60, 10);
  backLight.color.setHex(0xc525252);
  scene.add(backLight);
}

function initObjects() {
  //llavero
  keychain.rotation.z = -Math.PI / 9;
  codeMesh.castShadow = true;
  rectangleMesh.castShadow = true;
  scene.add(keychain);
}

function initScenario() {
  //suelo
  const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdedede,
  });
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  //pared
  const wallGeometry = new THREE.PlaneGeometry(1000, 1000);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xdedede,
    side: THREE.DoubleSide,
  });
  wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.z = 150;
  wall.receiveShadow = true;
  scene.add(wall);

  //base
  const cylinderGeometry = new THREE.CylinderGeometry(70, 70, 12, 200);
  const cylinderMaterial = new THREE.MeshPhongMaterial({
    color: 0xc404040,
  });
  base = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  base.position.y = 6;
  base.castShadow = true;
  base.receiveShadow = true;
  scene.add(base);
}

function animateChangeObject() {
  if (status == "changingModel1" && keychain) {
    if (keychain.position.x == 0) keychain.position.x = 3;
    keychain.position.x *= 1.2;

    var frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
    );

    if (keychain.position.x > 500 && keychain) {
      let pos = keychain.position;
      scene.remove(keychain.name);
      keychain = null;
      get_stl(url, function (data) {
        keychain = data;
        status = "waitingChangeModel";
        initObjects();
        keychain.position.x = -pos.x;
        status = "changingModel2";
      });
    }
  } else if (status == "changingModel2") {
    if (keychain.position.x <= -1) {
      keychain.position.x *= 0.9;
    } else {
      keychain.position.x = 0;
      status = "waitingChangeModel";
      setTimeout(function () {
        status = "rotating";
        urlInput.disabled = false;
        codeColorSelector.disabled = false;
        rectangleColorSelector.disabled = false;
        downloadButton.disabled = false;
      }, 500);
    }
  }
}

function animateLightning() {
  if (status === "lightning") {
    leftLight.intensity *= 1.02;
    rightLight.intensity *= 1.02;
    const maxLight = 0.7;
    if (leftLight.intensity >= maxLight) {
      leftLight.intensity = maxLight;
      rightLight.intensity = maxLight;
      backLight.intensity = 35;
      status = "rotating";
      urlInput.disabled = false;
      codeColorSelector.disabled = false;
      rectangleColorSelector.disabled = false;
      downloadButton.disabled = false;
    }
  }
}

function animateRotation() {
  if (status == "rotating") {
    keychain.rotation.y += 0.005;
    addMouseHandler();
  }
}

function animate() {
  requestAnimationFrame(animate);

  animateChangeObject();
  animateLightning();
  animateRotation();

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}

/** ------------------------- DOM FUNCTIONS ----------------------------------*/

var mouseDown = false,
  mouseX = 0,
  stopUserMovingTimeout;

function onMouseMove(evt) {
  if (!mouseDown || status != "userRotating") {
    return;
  }

  evt.preventDefault();

  var deltaX = evt.clientX - mouseX;
  mouseX = evt.clientX;

  keychain.rotation.y += deltaX / 100;
}

function onMouseDown(evt) {
  if (status != "rotating" && status != "userRotating") return;

  status = "userRotating";
  evt.preventDefault();

  if (stopUserMovingTimeout) {
    clearTimeout(stopUserMovingTimeout);
    stopUserMovingTimeout = null;
  }

  mouseDown = true;
  mouseX = evt.clientX;
}

function onMouseUp(evt) {
  if (status != "userRotating") return;

  if (stopUserMovingTimeout) {
    clearTimeout(stopUserMovingTimeout);
    stopUserMovingTimeout = null;
  }

  stopUserMovingTimeout = setTimeout(function () {
    status = "rotating";
  }, 1000);

  evt.preventDefault();
  mouseDown = false;
}

function addMouseHandler() {
  canvas.addEventListener(
    "mousemove",
    function (e) {
      onMouseMove(e);
    },
    false
  );
  canvas.addEventListener(
    "mousedown",
    function (e) {
      onMouseDown(e);
    },
    false
  );
  canvas.addEventListener(
    "mouseup",
    function (e) {
      onMouseUp(e);
    },
    false
  );
}

function onChangeUrl(e) {
  url = e.srcElement.value;
  status = "changingModel1";
  urlInput.disabled = true;
  codeColorSelector.disabled = true;
  rectangleColorSelector.disabled = true;
  downloadButton.disabled = true;
}

function exportKeychain() {
  const downloadUrl = URL.createObjectURL(currentZip);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "spotify-stl.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function onChangeColors() {
  codeMesh.material.color.set(codeColorSelector.value);
  rectangleMesh.material.color.set(rectangleColorSelector.value)
}

urlInput.onchange = onChangeUrl;
downloadButton.onclick = exportKeychain;
codeColorSelector.onchange = onChangeColors;
rectangleColorSelector.onchange = onChangeColors;

url = "https://open.spotify.com/playlist/37i9dQZEVXbNFJfN1Vw8d9";
urlInput.value = url;
status = "lightning";

init();
