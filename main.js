function main() {
    let fileInput = document.getElementById("fold-input");
    fileInput.addEventListener("change", event => {
        const fileList = event.target.files;
        render(fileList[0]);
    })
}

function render(file) {

    let canvas, scene, camera, renderer;

    // the fold object that gets passed in
    let fold;
    let rotationRadius = 30;

    // rotation in XZ plane
    let theta = 0;

    // rotation in a plane along Y axis
    let phi = Math.PI / 2;

    let isCamRotating = false;
    let isCamPanning = false;
    let zoomLimit = 2;
    let zoomMax = 30;
    const sensitivityScale = 0.01;
    let origin = new THREE.Vector3(0, 0, 0);

    initRenderer();

    let fReader = new FileReader();
    fReader.addEventListener("load", event => {
        let text = fReader.result;
        fold = JSON.parse(text);
        loadShapes();
    });
    fReader.readAsText(file);


    // init THREE.js rendering stuff
    function initRenderer() {
        canvas = document.getElementById("glCanvas");

        // working with WebGL context will be for the most part unnecessary as Three.js handles it
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(80, canvas.width / canvas.height, 0.1, 1000);

        // pass in canvas DOM element for Three to draw to
        renderer = new THREE.WebGLRenderer({
            canvas: canvas
        });

        // set up cam size
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvas.width, canvas.height);

        camera.position.setZ(30);
    }

    function loadShapes() {
        // clear the scene of existing objects
        scene.clear();
        let shapes = [];

        if (fold["file_frames"]) {
            // assuming one frame is creases and other is 3D folded shape
            for (let i = 0; i < fold["file_frames"].length; i++) {
                let frame = fold["file_frames"][i];

                // these class names are now specific to our implementation
                if (frame["frame_classes"].includes("foldedForm")) { // only add shape if it's 3D
                    let verts = frame["vertices_coords"];
                    let faces = frame["faces_vertices"];

                    // handle inheriting attributes if they don't exist in this frame
                    if (!verts) {
                        // ugly
                        verts = fold["file_frames"][frame["frame_parent"]]["vertices_coords"];
                    }
                    if (!faces) {
                        faces = fold["file_frames"][frame["frame_parent"]]["faces_vertices"];
                    }
                    console.log(verts, faces);
                    let createdGeom = createFaceGeom(verts, faces);

                    // in case of failure somehow do not add it to the scene
                    if (createdGeom) {
                        shapes.push(createdGeom);
                    }
                }
            }
        } else {
            shapes.push(createFaceGeom(fold["vertices_coords"], fold["faces_vertices"]));
        }

        shapes.forEach(shape => {
            scene.add(shape);
            const edges = new THREE.EdgesGeometry(shape.geometry);
            const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
                color: 0xffffff,
            }));
            scene.add(lines);
        })

        // default to using the first shape as the center as there is no way to calc it w/ >1 shapes
        shapes[0].geometry.computeBoundingSphere();
        origin = shapes[0].geometry.boundingSphere.center; // the origin that the cam orbits around
    }

    // prevent right clicks from opening the context menu anywhere
    document.addEventListener("contextmenu", e => {
        e.preventDefault();
    });

    // when clicking into the canvas, start rotating
    canvas.addEventListener("mousedown", e => {
        if (e.button === 0) {
            isCamRotating = true;
        } else if (e.button === 2) {
            isCamPanning = true;
        }
    });

    // listen for mouse release on the whole page to prevent accidental sticky rotate
    document.addEventListener("mouseup", e => {
        if (isCamRotating || isCamPanning) {
            isCamRotating = false;
            isCamPanning = false;
        }
    });

    let restrictionRangeY = 0.05;

    // orbit the camera upon mouse movement in the canvas, pan if right clicked
    canvas.addEventListener("mousemove", e => {
        if (isCamRotating) {
            theta -= degToRad(e.movementX);
            let n = phi - degToRad(e.movementY);
            if (n > Math.PI - restrictionRangeY) {
                phi = Math.PI - restrictionRangeY;
            } else if (n < restrictionRangeY) {
                phi = restrictionRangeY;
            } else {
                phi = n;
            }
        } else if (isCamPanning) { // prevent both pan and rotate at same time
            origin.setComponent(0, origin.x - (e.movementX * sensitivityScale)); // x axis movement
            origin.setComponent(2, origin.z - (e.movementY * sensitivityScale));
        }
    });

    // use scroll wheel to zoom
    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        let newZoom = rotationRadius + e.deltaY * 0.1;
        if (newZoom < zoomLimit) {
            rotationRadius = zoomLimit;
        } else if (newZoom > zoomMax) {
            rotationRadius = zoomMax;
        } else {
            rotationRadius = newZoom;
        }
    });

    function animate() {
        requestAnimationFrame(animate);

        let sphCoords = new THREE.Spherical(rotationRadius, phi, theta);
        camera.position.setFromSpherical(sphCoords);

        // offset spherical position to new origin as well for panning
        camera.position.addVectors(camera.position, origin);
        camera.lookAt(origin);

        renderer.render(scene, camera);
    }

    function createFaceGeom(vertex_coords, faces_vertices) {
        // both have to exist in order for the shape to be rendered
        if (vertex_coords && faces_vertices) {
            let triangleGeometry = new THREE.BufferGeometry();

            if (vertex_coords.some(el => el.length !== 3)) {
                vertex_coords = enforce3DCoordinates(vertex_coords);
            }

            // concatenating an empty array is a bit of a hack, bascially just squish the array
            let vertsArray = deepArrayConcat(new Array(), vertex_coords);
            vertsArray = mathCoordConversion(vertsArray);
            const vertices = new Float32Array(vertsArray);

            // check if there are any faces of more than three vertices
            if (faces_vertices.some(el => el.length > 3)) {
                faces_vertices = polygonToTri(faces_vertices);
            }
            triangleGeometry.setIndex(deepArrayConcat(new Array(), faces_vertices));
            triangleGeometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

            let plane = new THREE.Mesh(triangleGeometry,
                new THREE.MeshBasicMaterial({color: 0x885556, side: THREE.DoubleSide}));
            return plane;
        } else {
            alert("A shape was missing necessary information to be rendered");
            return null;
        }
    }


    function degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Given an array of arrays representing points, pads 'points' that do not have three values
     * with zeroes on the end, removes the last element of 'points' that have four elements. Does
     * not handle 'points' with n < 2 or n > 4 elements. This is necessary because FOLD objects
     * sometimes do not store the third value in the point, and assume it to be zero.
     * @param {Array} pointList A list of Arrays, representing points in 3D space
     * @returns {Array} The same list but with every point modified to be in 3D
     */
    function enforce3DCoordinates(pointList) {
        let outArray = [];
        for (let i = 0; i < pointList.length; i++) {
            let point = pointList[i];
            if (point.length === 2) {
                outArray = outArray.concat(point);
                outArray.push(0);
            } else if (point.length === 4) {
                point.pop();
                outArray = outArray.concat(point);
            } else {
                outArray = outArray.concat(point);
            }
        }
        return outArray;
    }

    /**
     * Helper function to cancatenate two arrays even if they have nested arrays inside
     * @param {Array} array1 The array to be concatenated to
     * @param {Array} array2 The array to concatenate onto array1
     * @returns {Array} The result of deep concatenation
     */
    function deepArrayConcat(array1, array2) {
        // TODO: handle in more graceful manner
        if (!array2) {
            alert("Something went wrong with coordinate arrays");
        }
        if (array2.some(el => Array.isArray(el))) {
            array2.forEach(element => {
                if (Array.isArray(element)) {
                    array1 = deepArrayConcat(array1, element);
                } else {
                    array1 = array1.concat(element);
                }
            });
            return array1;
        } else {
            array1 = array1.concat(array2);
            return array1;
        }
    }

    /**
     * Function to split an array of indexed vertices as faces into triangles if they aren't already
     * @param {Array} array A list of faces made by referencing indexed vertices
     * @returns {Array} The original array modified to have many triangles instead of polygons
     */
    function polygonToTri(array) {
        let outArray = [];
        for (let i = 0; i < array.length; i++) {
            let len = array[i].length;
            if (len === 3) {
                outArray.push(array[i]);
            } else if (len === 4) { // unsure about higher polygons so only handle rect
                // get the last three elements, then get the first three elements
                outArray.push(array[i].slice(0, 3));
                /*
                 * since the face has its vertices listed in a consistent counterclockwise or
                 * clockwise order, we don't need the first three then last three, we need
                 * the first three, then the triangle opposite that is formed by the last two
                 * vertices and the first one
                 * this does that by moving the first element
                 */
                let shifted = array[i];
                shifted.push(array[i].shift())
                outArray.push(shifted.slice(-3));
            } else if (len < 3 || len > 4) {
                // TODO: replace with better alert when frontend is more permanent
                alert("Polygon rendering encountered unexpected shapes");
            }
        }
        return outArray;
    }

    /**
     * Helper function to convert from XYZ (FOLD) to XZY (THREE.js) and possibly back as well. Used
     * on arrays of values every 3 representing one point, like after calling deepArrayConcat() on
     * the vertices from FOLD
     * @param {Array} coordsArray An array of coordinates where every 3 values is one point
     * @returns A converted array where the second and third values of each coord are swapped
     */
    function mathCoordConversion(coordsArray) {
        let outArray = [];
        for (let i = 0; i < coordsArray.length; i++) {
            let specialIndex = (i + 1) % 3;
            if (!(specialIndex === 2)) {
                outArray.push(coordsArray[i]);
            }
            if (specialIndex === 0) {
                outArray.push(coordsArray[i - 1]);
            }
        }
        return outArray;
    }

    animate();
}


function drawVertLine(){
  // data
  const vertices_coords = simpleJsonObj['vertices_coords']
  const edges_vertices = simpleJsonObj['edges_vertices']

  const svgns = "http://www.w3.org/2000/svg";
  let newRect = document.createElementNS(svgns, "rect");

        // draw rectangle
        newRect.setAttribute("x", vertices_coords[0][0]);
        newRect.setAttribute("y", vertices_coords[0][0]);
        newRect.setAttribute("width", "800");
        newRect.setAttribute("height", "600");
        newRect.setAttribute("fill", "#5cceee");
        newRect.setAttribute("stroke", "black");
        newRect.setAttribute('stroke-width', '.5');

        // append the new rectangle to the svg
        svg.appendChild(newRect);

  // draws line
  for (const edge of edges_vertices) {
    let newline = document.createElementNS(svgns, "line");

      // console.log('Looking at edge ', edge);
      // x coordniate
      const from_vertex_index = edge[0];
      // y coordniate
      const to_vertex_index = edge[1];

      // console.log(`  |- Draw a line from #${from_vertex_index} -> #${to_vertex_index}`);
      const from_coords = vertices_coords[from_vertex_index];
      const to_coords = vertices_coords[to_vertex_index];

      // console.log(`  |- Line coordinates are from `, from_coords, ' to ', to_coords);


      // draw line

      newline.setAttribute('x1',from_coords[0] * 100) ;
      newline.setAttribute('y1', from_coords[1] * 100);
      newline.setAttribute('x2', to_coords[0] * 100);
      newline.setAttribute('y2', to_coords[1] * 100) ;
      newline.setAttribute('stroke-width', '.5');
      newline.setAttribute("stroke", "white")
      newline.setAttribute('stroke-dasharray', "6")
      // console.log("***************from__coords***8",from_coords[0])
      // console.log("***************to_coords****",to_coords[1])
      svg.appendChild(newline);






  // variable for the namespace

  // make a simple rectangle



// vertixs array for rect min and max


  }

  // loop over edges arrays for line

}


function findNearestVert(){

    // loop through the vertices and calculate the distance between the vertex and where ever the user is

    const vertices_coords = simpleJsonObj['vertices_coords']
    const edges_vertices = simpleJsonObj['edges_vertices']


    for (const edge of edges_vertices) {

        console.log('Looking at edge ', edge);
        // x coordniate
        const from_vertex_index = edge[0];
        // y coordniate
        const to_vertex_index = edge[1];

        // console.log(`  |- Draw a line from #${from_vertex_index} -> #${to_vertex_index}`);
        // const from_coords = vertices_coords[from_vertex_index];
        // const to_coords = vertices_coords[to_vertex_index];

        // console.log(`  |- Line coordinates are from `, from_coords, ' to ', to_coords);


        // draw line

        console.log(Math.hypot(edge[0],edge[1],24,10))


    }
}






window.onload = function() {
  main();
  findNearestVert()
  drawVertLine();
}