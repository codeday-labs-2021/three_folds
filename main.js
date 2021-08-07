/**
 * THREE-FOLDS
 * An origami simulator with 3D and 2D views of a FOLD pattern using Three.js
 *
 * Jason Gao and Farhan Begg
 * Under the mentorship of Steven Stadnicki
 */

"use strict";

const FOLD = require("fold");

function main() {
    let fileInput = document.getElementById("fold_input");
    let reRender = false;

    fileInput.addEventListener("change", event => {
        const fileList = event.target.files;
        render(fileList[0], reRender);
        reRender = true;
    });

    document.getElementById("line1").addEventListener("change", function() {
        changeEdgeAngle(this.value, selectedLines[0]);
    });

    // !!IMPORTANT --> UNCOMMENT THIS AND DELETE OTHER PART ONLY WHEN OPTIMIZED
    // document.getElementById("line1").addEventListener("input", function() {
    //     changeEdgeAngle(this.value, selectedLines[0]);
    // });

    let foldObj;


    function render(file, reRender) {
        let fReader = new FileReader();
        fReader.addEventListener("load", () => {
            let text = fReader.result;
            foldObj = JSON.parse(text);
            render2D(foldObj, reRender);
            render3D(foldObj, reRender);
        });
        fReader.readAsText(file);
    }

    const svgns = "http://www.w3.org/2000/svg";
    const vertexEpsilon = 20;
    const lineEpsilon = 15;
    let svg = document.getElementById("svg");


    const mathLines = [];
    const mathVertices = [];
    const edges_angles = []; // angle b/w the normals of the two faces on sides of the edge
    let creaseFrameExists;

    // NOTE selected points and lines will store indices of corresponding in mathVerts and mathLines
    const selectedPoints = [];
    const selectedLines = [];
    const selectedSVGCircles = [];
    const selectedSVGLines = [];

    let xOffset, yOffset;
    let xScale, yScale;

    // SVG render and calculating the scaling from FOLD to the SVG
    function render2D(foldObj, reRender) {

        creaseFrameExists = false;

        // this is ugly as hell, could use a refactor to use less arrays
        mathLines.length = 0;
        mathVertices.length = 0;
        edges_angles.length = 0;
        selectedPoints.length = 0;
        selectedLines.length = 0;
        selectedSVGCircles.length = 0;
        selectedSVGLines.length = 0;

        drawVertLine();
        initSVGListeners();
        if (!reRender) {
            initButtonListeners();
        }

        function drawVertLine(){
            svg.innerHTML = "";
            // data
            let frame = foldObj["file_frames"];
            if (frame) {
                for (let i = 0; i < frame.length; i++) {
                    if (frame[i]["frame_classes"][0] === "creasePattern") {
                        frame = frame[i];
                        creaseFrameExists = true;
                    }
                }
            }
            // quick fix for fold library method not working properly w/ diagonal-unfolded.fold
            if (foldObj["frame_classes"]) {
                if (foldObj["frame_classes"][0] === "creasePattern") {
                    creaseFrameExists = true;
                    frame = foldObj;
                }
            }

            // not gonna handle inheritance, just expect creasePattern to have all info
            let vertices_coords, edges_vertices;
            if (creaseFrameExists) {
                vertices_coords = frame["vertices_coords"];
                edges_vertices = frame["edges_vertices"];
            } else {
                FOLD.convert.flatFoldedGeometry(foldObj);
                vertices_coords = foldObj["vertices_flatFoldCoords"];
                edges_vertices = foldObj['edges_vertices'];
            }


            let newRect = document.createElementNS(svgns, "rect");

            let viewportDim = document.querySelector("svg").viewBox.baseVal;

            // find line information to adjust and scale them to the viewport
            [xOffset, yOffset] = [0, 0];
            let [minX, maxX] = [Infinity, -Infinity];
            let [minY, maxY] = [Infinity, -Infinity];
            let edgesSegments = [];
            for (let i = 0; i < edges_vertices.length; i++) {
                let edge = edges_vertices[i];
                // x coordinate
                const from_vertex_index = edge[0];
                // y coordniate
                const to_vertex_index = edge[1];


                const from_coords = vertices_coords[from_vertex_index];
                const to_coords = vertices_coords[to_vertex_index];

                let line = from_coords.concat(to_coords);
                edgesSegments.push(line);

                // this part finds the max offsets so everything can be shifted into a viewable position
                let x1 = from_coords[0];
                let x2 = to_coords[0];
                if (x1 < 0 || x2 < 0) {
                    xOffset = Math.max(Math.abs(x2), Math.abs(x1), xOffset);
                }
                let y1 = from_coords[1];
                let y2 = to_coords[1];
                if (y1 < 0 || y2 < 0) {
                    yOffset = Math.max(Math.abs(y2), Math.abs(y1), yOffset);

                }

                // for scaling purposes, hopefully only needs to be done once
                minX = Math.min(minX, x1, x2);
                maxX = Math.max(maxX, x1, x2);
                minY = Math.min(minY, y1, y2);
                maxY = Math.max(maxY, y1, y2);
            }

            // getting the max X and Y size of the viewbox
            xScale = viewportDim["width"] / (maxX - minX);
            yScale = viewportDim["height"] / (maxY - minY);

            // draw the base rectangle
            newRect.setAttribute("x", (minX + xOffset) * xScale);
            newRect.setAttribute("y", (minY + yOffset) * yScale);
            newRect.setAttribute("width", viewportDim["width"]);
            newRect.setAttribute("height", viewportDim["height"]);
            newRect.setAttribute("fill", "#5cceee");
            newRect.setAttribute("stroke", "black");
            newRect.setAttribute('stroke-width', '.2')

            // append the new rectangle to the svg
            svg.appendChild(newRect);

            // draw crease lines
            for (let i = 0; i < edgesSegments.length; i++) {
                let line = edgesSegments[i];
                drawLine(line, xOffset, xScale, yOffset, yScale);
            }

            // init the math vertices
            for (let i = 0; i < vertices_coords.length; i++) {
                mathVertices.push(new THREE.Vector3((vertices_coords[i][0] + xOffset) * xScale,
                    (vertices_coords[i][1] + yOffset) * yScale, 0));
            }


            // variable for the namespace
            // make a simple rectangle
            // vertixs array for rect min and max
            // loop over edges arrays for line

        }

        function initSVGListeners() {
            svg.parentNode.replaceChild(svg.cloneNode(true), svg);
            svg = document.querySelector("svg");
            svg.addEventListener("click", function clickEvent(event) {clickAPoint(event)});
        }

        function initButtonListeners() {
            document.getElementById("huzita1").addEventListener("click", () => {
                foldAxiom1(mathVertices[selectedPoints[0]], mathVertices[selectedPoints[1]])});

            document.getElementById("huzita2").addEventListener("click", () => {
                foldAxiom2(mathVertices[selectedPoints[0]], mathVertices[selectedPoints[1]])});

            document.getElementById("huzita3").addEventListener("click", () => {
                foldAxiom3(mathLines[selectedLines[0]], mathLines[selectedLines[1]])});

            document.getElementById("huzita4").addEventListener("click", () => {
                foldAxiom4(mathVertices[selectedPoints[0]], mathLines[selectedLines[0]])});

            document.getElementById("huzita5").addEventListener("click", foldAxiom5);
            document.getElementById("huzita6").addEventListener("click", foldAxiom6);

            document.getElementById("huzita7").addEventListener("click", () => {
                foldAxiom7(mathVertices[selectedPoints[0]],
                mathLines[selectedLines[0]], mathLines[selectedLines[1]])});
        }

        /**
         * Handles the behavior upon clicking on the SVG
         * @param {Object} event The click event from the listener
         */
        function clickAPoint(event) {
            let x = event.offsetX;
            let y = event.offsetY;


            let clickPosition = new THREE.Vector3(x, y, 0);

            let vertsDistances = mathVertices.map(vert => vert.distanceTo(clickPosition));
            let vertSelected = false;
            let i = 0;
            while (!vertSelected && i <= vertsDistances.length) {
                if (vertsDistances[i] < vertexEpsilon) {
                    selectPoint(i);
                    vertSelected = true;
                }
                i++;
            }
            if (!vertSelected) {
                let closestPoints = mathLines.map(line => {
                    let p = new THREE.Vector3();
                    line.closestPointToPoint(clickPosition, true, p);
                    return p;
                });
                let pointDistances = closestPoints.map(point => point.distanceTo(clickPosition));
                let min = 0;
                for (let i = 0; i < pointDistances.length; i++) {
                    if (pointDistances[i] < pointDistances[min]) {
                        min = i;
                    }
                }
                if (pointDistances[min] < lineEpsilon) {
                    selectLine(min);
                }
            }
        }

        /**
         * Handles the selected point and draws the corresponding selection to the SVG view
         * @param {Vector3} point A THREE Vector3 representing a point that is selected on the SVG
         */
        function selectPoint(index) {
            if (selectedPoints.includes(index)) {
                let toggleIndex = selectedPoints.indexOf(index);
                selectedPoints.splice(toggleIndex, 1);
                selectedSVGCircles[toggleIndex].remove();
                selectedSVGCircles.splice(toggleIndex, 1);
            } else {
                let point = mathVertices[index];
                let circle = document.createElementNS(svgns, "circle");
                circle.setAttribute("cx", point.x);
                circle.setAttribute("cy", point.y);
                circle.setAttribute("r", 5);
                circle.classList.add("selection");
                svg.appendChild(circle);

                selectedSVGCircles.push(circle);
                selectedPoints.push(index);

                // only allow to select two points at a time, implement like queue
                if (selectedSVGCircles.length > 2) {
                    selectedSVGCircles.shift().remove();
                }
                if (selectedPoints.length > 2) {
                    selectedPoints.shift();
                }
            }
            changeSelection();
        }

        /**
         * Handles selecting a line and draws a corresponding line selection onto the SVG view
         * @param {Number} index the index of the line being selected, corresponding to mathLines
         */
        function selectLine(index) {
            if (selectedLines.includes(index)) {
                let toggleIndex = selectedLines.indexOf(index);
                selectedLines.splice(toggleIndex, 1);
                selectedSVGLines[toggleIndex].remove();
                selectedSVGLines.splice(toggleIndex, 1);
            } else {
                let line = mathLines[index];
                let newline = document.createElementNS(svgns, "line");
                newline.setAttribute('x1', line.start.x);
                newline.setAttribute('y1', line.start.y);
                newline.setAttribute('x2', line.end.x);
                newline.setAttribute('y2', line.end.y);
                newline.setAttribute('stroke-width', '5');
                newline.setAttribute("stroke", "black")
                newline.setAttribute('stroke-dasharray', "2")
                newline.classList.add("selection");
                svg.appendChild(newline);

                selectedSVGLines.push(newline);
                selectedLines.push(index);

                // only allow to select two lines at a time
                if (selectedSVGLines.length > 2) {
                    selectedSVGLines.shift().remove();
                }
                if (selectedLines.length > 2) {
                    selectedLines.shift();
                }
            }
            changeSelection();
        }
    }

    /**
     * Draws the crease line onto the SVG
     * @param {Array} line Four values of the form [x1, y1, x2, y2] representing a line b/w 2 points
     */
     function drawLine(line, xOffset, xScale, yOffset, yScale) {
        line[0] = (line[0] + xOffset) * xScale;
        line[1] = (line[1] + yOffset) * yScale;
        line[2] = (line[2] + xOffset) * xScale;
        line[3] = (line[3] + yOffset) * yScale;


        let newline = document.createElementNS(svgns, "line");
        newline.setAttribute('x1', line[0]);
        newline.setAttribute('y1', line[1]);
        newline.setAttribute('x2', line[2]);
        newline.setAttribute('y2', line[3]);
        newline.setAttribute('stroke-width', '2');
        newline.setAttribute("stroke", "white")
        newline.setAttribute('stroke-dasharray', "2")
        svg.appendChild(newline);

        // also construct the lines into THREE math objects
        mathLines.push(new THREE.Line3(new THREE.Vector3(line[0], line[1], 0),
            new THREE.Vector3(line[2], line[3], 0)));
        edges_angles.push(0);
    }

    let canvas, scene, camera, renderer;
    const mathLines3D = [];

    let rotationRadius = 5;

    // rotation in XZ plane
    let theta = 0;

    // rotation in a plane along Y axis
    let phi = Math.PI / 2;

    // camera limits and settings
    let isCamRotating = false;
    let isCamPanning = false;
    const zoomLimit = 1;
    const zoomMax = 30;
    const restrictionRangeY = 0.05;
    const sensitivityScale = 0.0025;
    const zoomSensitivity = 0.01;
    let origin = new THREE.Vector3(0, 0, 0);


    let foldVerts;
    let foldEdges;
    let foldFaceVerts;
    let foldFaceEdges;

    // handle the main 3D rendering
    function render3D(foldObj, reRender) {

        if (!reRender) {
            initRenderer();
            init3DListeners();
            animate();
        }
        loadShapes();

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

            camera.position.setZ(rotationRadius);
        }

        function loadShapes() {
            // clear the scene of existing objects
            scene.clear();
            let shapes = [];

            setFoldObjGlobalReferences(foldObj);

            let createdGeom = createFaceGeom(foldVerts, foldFaceVerts);
            if (createdGeom) shapes.push(createdGeom);

            shapes.forEach(shape => {
                scene.add(shape);
                const edgeGeom = new THREE.EdgesGeometry(shape.geometry);
                const lineSegments = new THREE.LineSegments(edgeGeom, new THREE.LineBasicMaterial({
                    color: 0xffffff,
                }));
                scene.add(lineSegments);
            })

            // default to using the first shape as the center as there is no way to calc it w/ >1 shapes
            shapes[0].geometry.computeBoundingSphere();
            origin = shapes[0].geometry.boundingSphere.center; // the origin that the cam orbits around
            rotationRadius = shapes[0].geometry.boundingSphere.radius * 1.7;
        }

        // stop loading repeat listeners, what do i do with the leftover 'lost' listeners?
        function init3DListeners(reRender) {
            // some listeners require access to the objects in this instance of the function

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
                let newZoom = rotationRadius + e.deltaY * zoomSensitivity;
                if (newZoom < zoomLimit) {
                    rotationRadius = zoomLimit;
                } else if (newZoom > zoomMax) {
                    rotationRadius = zoomMax;
                } else {
                    rotationRadius = newZoom;
                }
            });
        }

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

                createMath3DLines(); // this is really lazy here to just use the globals

                let triangleGeometry = new THREE.BufferGeometry();

                if (vertex_coords.some(el => el.length !== 3)) {
                    vertex_coords = enforce3DCoordinates(vertex_coords);
                }

                // concatenating an empty array is a bit of a hack, bascially just squish the array
                let vertsArray = vertex_coords.flat(Infinity);
                vertsArray = mathCoordConversion(vertsArray);
                const verticesValues = new Float32Array(vertsArray);

                // check if there are any faces of more than three vertices
                if (faces_vertices.some(el => el.length > 3)) {
                    faces_vertices = polygonToTri(faces_vertices);
                }
                triangleGeometry.setIndex(faces_vertices.flat(Infinity));
                triangleGeometry.setAttribute("position", new THREE.BufferAttribute(verticesValues, 3));

                let plane = new THREE.Mesh(triangleGeometry,
                    new THREE.MeshBasicMaterial({color: 0x885556, side: THREE.DoubleSide}));
                return plane;
            } else {
                alert("A shape was missing necessary information to be rendered");
                return null;
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
         * TODO check if this is really necessary
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
    }

    function setFoldObjGlobalReferences(foldObj) {
        if (foldObj["file_frames"]) {
            // assuming one frame is creases and other is 3D folded shape
            let primaryStructureFound = foldObj["file_frames"].some(frame => {
                return frame["frame_classes"].includes("foldedForm");
            });

            for (let i = 0; i < foldObj["file_frames"].length; i++) {
                let frame = foldObj["file_frames"][i];

                // these class names are specific to our implementation
                if (frame["frame_classes"].includes("foldedForm")) { // only add shape if it's 3D
                    let verts = frame["vertices_coords"];
                    let faces = frame["faces_vertices"];
                    let edges = frame["edges_vertices"];
                    let faceEdges = frame["faces_edges"];
                    // handle inheriting attributes if they don't exist in this frame
                    if (!verts) {
                        // ugly
                        verts = foldObj["file_frames"][frame["frame_parent"]]["vertices_coords"];
                    }
                    if (!faces) {
                        faces = foldObj["file_frames"][frame["frame_parent"]]["faces_vertices"];
                    }
                    if (!edges) {
                        edges = foldObj["file_frames"][frame["frame_parent"]]["edges_vertices"];
                    }
                    if (!faceEdges) {
                        faceEdges = foldObj["file_frames"][frame["frame_parent"]]["faces_edges"];
                    }
                    foldVerts = verts;
                    foldEdges = edges;
                    foldFaceVerts = faces;
                    foldFaceEdges = faceEdges;

                } else if (frame["frame_classes"].includes("creasePattern") && !primaryStructureFound) {
                    foldVerts = frame["vertices_coords"];
                    foldEdges = frame["edges_vertices"];
                    foldFaceVerts = frame["faces_vertices"];
                    foldFaceEdges = frame["faces_edges"];
                }
            }
        } else {
            foldVerts = foldObj["vertices_coords"];
            foldEdges = foldObj["edges_vertices"];
            foldFaceVerts = foldObj["faces_vertices"];
            foldFaceEdges = foldObj["faces_edges"];
        }
    }

    // create corresponding math lines in the 3D so we can match up when making new verts later
    function createMath3DLines() {
        mathLines3D.length = 0;
        for (let i = 0; i < foldEdges.length; i++) {
            let p1 = foldVerts[foldEdges[i][0]];
            let p2 = foldVerts[foldEdges[i][1]];
            let start = new THREE.Vector3(p1[0], p1[1], p1[2]);
            let end = new THREE.Vector3(p2[0], p2[1], p2[2]);
            mathLines3D.push(new THREE.Line3(start, end));
        }
    }

    /**
     * Handles changing the angles of selected edges, where the "angle" of an edge is the angle b/w
     * the normals of the two faces sharing that edge
     * @param {Number} angle the angle to change the edge to
     * @param {Number} edgeIndex the index corresponding to mathLines to reference which edge it is
     */
    function changeEdgeAngle(angle, edgeIndex) {
        // also change the angle in the 3D part here

        // if a point is selected, prioritize folding that side
        let selectedPrimaryVert;
        if (selectedPoints.length > 0) {
            selectedPrimaryVert = convertPointOnEdge2Dto3D(
                mathVertices[selectedPoints[0]]
            ).toArray();
        }

        // get all the faces that have this edge as an index
        let facesWithSelectedEdge = [];
        for (let i = 0; i < foldFaceEdges.length; i++) {
            if (foldFaceEdges[i].includes(edgeIndex)) {
                // we want the verts, the faces ordering should correspond to the same ones, right?
                facesWithSelectedEdge.push(foldFaceVerts[i]);
            }
        }

        // get the face that the selected point is on
        let faceToRotateIndex = 0;
        for (let i = 0; i < facesWithSelectedEdge.length; i++) {
            for (let j = 0; j < facesWithSelectedEdge[i].length; j++) {
                if (arraysEqual(foldVerts[facesWithSelectedEdge[i][j]], selectedPrimaryVert)) {
                    faceToRotateIndex = i;
                }
            }
        }

        // get the vertices that don't include the selected edge
        let faceToRotate = facesWithSelectedEdge[faceToRotateIndex];
        let vertsIndicesToRotate = [];
        for (let i = 0; i < faceToRotate.length; i++) {
            if (!(foldEdges[edgeIndex].includes(faceToRotate[i]))) {
                vertsIndicesToRotate.push(faceToRotate[i]);
            }
        }

        let angleToRotate = angle - edges_angles[edgeIndex];
        let start = arrayToVector3(foldVerts[foldEdges[edgeIndex][0]]);
        let end = arrayToVector3(foldVerts[foldEdges[edgeIndex][1]]);
        let rotationAxis = new THREE.Line3(start, end);
        makeVertsRotation(foldVerts, vertsIndicesToRotate, rotationAxis, angleToRotate);

        edges_angles[edgeIndex] = angle;

    }

    /**
     * Handles actually rotating the vertices using THREE matrix math
     * @param {Array} verts vertices_coords on the fold object
     * @param {Array} rotateIndices indices of the verts to rotate
     * @param {Line3} axisLine the axis to rotate the vertices around
     * @param {Number} angle the angle to rotate the vertices by
     */
    function makeVertsRotation(verts, rotateIndices, axisLine, angle) {
        let axis = new THREE.Vector3();
        axisLine.delta(axis);
        axis.normalize();

        let rotationMatrix = new THREE.Matrix4();
        angle = degToRad(angle);
        rotationMatrix.makeRotationAxis(axis, angle);

        let translationVector = new THREE.Vector3();
        axisLine.getCenter(translationVector);

        let translationMatrix = new THREE.Matrix4();
        translationMatrix.makeTranslation(
            -translationVector.x,
            -translationVector.y,
            -translationVector.z
        );
        let inverseTranslationMatrix = new THREE.Matrix4();
        inverseTranslationMatrix.makeTranslation(
            translationVector.x,
            translationVector.y,
            translationVector.z
        );

        for (let i = 0; i < rotateIndices.length; i++) {
            let index = rotateIndices[i];

            let vertVector = arrayToVector3(verts[index]);
            vertVector.applyMatrix4(translationMatrix);
            vertVector.applyMatrix4(rotationMatrix);
            vertVector.applyMatrix4(inverseTranslationMatrix);

            verts[index] = [
                round(vertVector.x), round(vertVector.y), round(vertVector.z)
            ]; // modify the fold object in place
        }

        // make a call to render everything again
        render3D(foldObj, true);
    }


    /**
     * Creates a new edge on the shape
     * @param {Vector3} v1 A THREE Vector3, the start of the line
     * @param {Vector3} v2 the second Vector3, representing the end of the line
     */
     function createNewEdge(v1, v2) {
        /**
         * this will do the same as the drawLine function but will be able to take vectors
         * directly from the existing mathVertices array. it might need to modify the foldObj, or it
         * will just call drawLine again. Also needs to check if the lines cross any other, and
         * make new vertices
         */
        let newEdge = new THREE.Line3(v1, v2);
        if (!(mathLines.some(line => newEdge.equals(line)))) {
            drawLine(
                [newEdge.start.x, newEdge.start.y, newEdge.end.x, newEdge.end.y],
                0,
                1,
                0,
                1
            );

            // also make a new edge in the fold object
            let point1 = convertPointOnEdge2Dto3D(v1);
            let point2 = convertPointOnEdge2Dto3D(v2);
            point1 = stripLastZero([point1.x, point1.y, point1.z]);
            point2 = stripLastZero([point2.x, point2.y, point2.z]);

            // this also adds the necessary vertices, i think
            FOLD.filter.addEdgeAndSubdivide(foldObj, point1, point2, 0.0001);
            mathLines3D.push(new THREE.Line3(
                (new THREE.Vector3()).fromArray(point1),
                (new THREE.Vector3()).fromArray(point2)
            ));


            // let intersections = [];
            for (let i = 0; i < mathLines.length; i++) {
                /**
                 * FOLD.geom.segmentIntersectSegment expects two line segments s1, s2, where each is
                 * an array of two points, where each point is an array of two values, x and y
                 * ex: s1=[[x1, y1], [x2, y2]], s2=[[x3, y3], [x4, y4]]
                 * and returns their intersection as an array with two values representing a point
                 */
                let intersection = FOLD.geom.segmentIntersectSegment(
                    [
                        [newEdge.start.x, newEdge.start.y],
                        [newEdge.end.x, newEdge.end.y]
                    ],
                    [
                        [mathLines[i].start.x, mathLines[i].start.y],
                        [mathLines[i].end.x, mathLines[i].end.y]
                    ]
                );
                if (intersection) {
                    createNewVert(new THREE.Vector3(intersection[0], intersection[1], 0));
                    // fold doesn't check for intersections when adding the edge so we do it
                    let interCoords = convertPointOnEdge2Dto3D(new THREE.Vector3(intersection[0], intersection[1], 0));
                    interCoords = stripLastZero([interCoords.x, interCoords.y, interCoords.z]);

                    FOLD.filter.addVertexAndSubdivide(foldObj, interCoords, 0.0001);
                }
            }
            // regenerate the faces
            FOLD.convert.edges_vertices_to_vertices_vertices_sorted(foldObj);
            FOLD.convert.vertices_vertices_to_faces_vertices(foldObj);
            FOLD.convert.faces_vertices_to_faces_edges(foldObj);
            setFoldObjGlobalReferences(foldObj);
            // re-render the SVG here to enfore parity b/w the fold and the math lines and points
            render2D(foldObj, true);
            createMath3DLines();
        }
    }

    // creates a new vertice given a Vector3 if there isn't a vertex already there
    function createNewVert(vert) {
        // this will handle adding new vertices to the SVG and the data structures as well if needed
        vert.x = round(vert.x);
        vert.y = round(vert.y);
        if (!mathVertices.some(v => v.equals(vert))) {
            mathVertices.push(vert);
        }
    }


    /**
     * Function checks all collisions of a long line with the existing lines, returning an array
     * with all the intersections.
     * @param {Vector3} origin A THREE vector representing the starting point of the line to check
     * @param {Vector3} vector A THREE vector representing the direction to check in
     * @param {Number} distance How far forward and backwards to check
     * @returns {Array} an array of all the points that the line intersected
     */
    function lineAllCollisions(origin, vector, distance=4000) {
        vector.normalize();
        console.log("vec", vector);
        console.log("orig", origin);
        let lineStart = [origin.x - (vector.x * distance), origin.y - (vector.y * distance)];
        let lineEnd = [origin.x + (vector.x * distance), origin.y + (vector.y * distance)];
        let intersections = [];

        console.log(mathLines);
        console.log("segstart and end", lineStart, lineEnd);
        for (let i = 0; i < mathLines.length; i++) {
            let interSectPt = FOLD.geom.segmentIntersectSegment([lineStart, lineEnd], [
                [mathLines[i].start.x, mathLines[i].start.y],
                [mathLines[i].end.x, mathLines[i].end.y]
            ]);
            console.log(interSectPt);
            if (interSectPt) {
                intersections.push([round(interSectPt[0]), round(interSectPt[1])]);
            }
        }
        console.log("intersections", intersections);
        return intersections;
    }

    /**
     * Given the origin and direction vector, finds the limits of the line as a crease in the shape
     */
    function findLineLimits(origin, direction) {
        let intersections = lineAllCollisions(origin, direction);
        let indexMaxX = 0;
        let indexMaxY = 0;
        let indexMinX = 0;
        let indexMinY = 0;

        // scuffed way of checking this, i can't think of a better way w/o adding an edges array
        for (let i = 0; i < intersections.length; i++) {
            if (intersections[i][0] > intersections[indexMaxX][0]) {
                indexMaxX = i;
            }
            if (intersections[i][1] > intersections[indexMaxY][1]) {
                indexMaxY = i;
            }
            if (intersections[i][0] < intersections[indexMinX][0]) {
                indexMinX = i;
            }
            if (intersections[i][1] < intersections[indexMinY][1]) {
                indexMinY = i;
            }
        }
        if (arraysEqual(intersections[indexMaxX], intersections[indexMaxY])) {
            return [new THREE.Vector3(intersections[indexMaxX][0], intersections[indexMaxX][1], 0),
                new THREE.Vector3(intersections[indexMinX][0], intersections[indexMinX][1], 0)]
        } else {
            return [new THREE.Vector3(intersections[indexMaxX][0], intersections[indexMaxX][1], 0),
                new THREE.Vector3(intersections[indexMaxY][0], intersections[indexMaxY][1], 0)];
        }
    }

    /**
     * This unfortunately assumes that when constructed, the mathLines and mathLines3D have all the
     * same corresponding lines in the same places, and will break horribly if this is not the case
     * @param {Vector3} point a point on an edge in the SVG to be converted to the location in 3D
     * @returns {Vector3} a Vector3 that the corresponding 3D point has been copied into
     */
    function convertPointOnEdge2Dto3D(point) {
        for (let i = 0; i < mathLines.length; i++) {
            let closestPointOnLine = new THREE.Vector3();
            mathLines[i].closestPointToPoint(point, true, closestPointOnLine)
            if (closestPointOnLine.equals(point)) {
                let returnPoint = new THREE.Vector3();
                mathLines3D[i].at(
                    mathLines[i].closestPointToPointParameter(point, true), returnPoint
                );
                return returnPoint;
            }
        }
    }


    // which combinations of selected points and lines correspond to which axioms
    const huzitaOptions = [
        {p:2, l:0},
        {p:2, l:0},
        {p:0, l:2},
        {p:1, l:1},
        {p:2, l:1},
        {p:2, l:2},
        {p:1, l:2}
    ]
    const buttons = [];
    for (let i = 0; i < huzitaOptions.length; i++) {
        buttons.push(document.getElementById(`huzita${i+1}`));
    }

    // to be called whenever a change is made to selected, updates the buttons to available options
    function changeSelection() {
        let np = selectedPoints.length;
        let nl = selectedLines.length;
        for (let i = 0; i < buttons.length; i++) {
            if (huzitaOptions[i].p === np && huzitaOptions[i].l === nl) {
                buttons[i].disabled = false;
            } else {
                buttons[i].disabled = true;
            }
        }
        let line1Range = document.getElementById("line1");
        if (selectedLines.length === 1) {
            line1Range.value = edges_angles[selectedLines[0]];
            line1Range.classList.remove("hidden");
        } else {
            line1Range.classList.add("hidden");
        }
    }

    /**
     * For all folding operations by axioms, see https://en.wikipedia.org/wiki/Huzita–Hatori_axioms
     */

    // create a new edge using the two points selected
    function foldAxiom1(p1, p2) {
        createNewEdge(p1, p2);
    }

    // bisect the line b/w the two selected points and use orthogonal line to make the crease
    function foldAxiom2(p1, p2) {
        let bisector = new THREE.Vector3();
        let lineBetween = new THREE.Line3(p1, p2);
        let pointDirection = new THREE.Vector3();
        lineBetween.delta(pointDirection);
        let origin = new THREE.Vector3();
        lineBetween.getCenter(origin);
        bisector.crossVectors(pointDirection, new THREE.Vector3(0, 0, 1));

        console.log("orig points data", origin, bisector);
        let newVerts = findLineLimits(origin, bisector);

        createNewEdge(newVerts[0], newVerts[1]);
        console.log("reached end of axiom2");
    }

    // find bisector for the two lines, then intersection point, take this as the crease
    function foldAxiom3(l1, l2) {
        // find the direction of the bisecting line
        let bisector = new THREE.Vector3();

        let dir1 = new THREE.Vector3();
        l1.delta(dir1);
        let dir2 = new THREE.Vector3();
        l2.delta(dir2);

        // console.log(dir1, dir2);
        // we need the two vectors to be pointing in the same direction
        let dotProduct = dir1.dot(dir2);

        // this is a hack fix and only works on the edges
        let edgeCase1 = l1.end.equals(l2.start);
        let edgeCase2 = l2.end.equals(l1.start);

        if (dotProduct < 0) {
            dir1.multiplyScalar(-1);
        } else if (dotProduct === 0) {
            if (edgeCase1) {
                dir2.multiplyScalar(-1);
            } else if (edgeCase2) {
                dir1.multiplyScalar(-1);
            }
        }
        bisector.addVectors(dir1.normalize(), dir2.normalize()).normalize();

        // find the origin point where the lines intersect
        let origin = FOLD.geom.segmentIntersectSegment([
                [l1.start.x - (dir1.x * 1000), l1.start.y - (dir1.y * 1000)],
                [l1.end.x + (dir1.x * 1000), l1.end.y + (dir1.y * 1000)]
            ],
            [
                [l2.start.x - (dir2.x * 1000), l2.start.y - (dir2.y * 1000)],
                [l2.end.x + (dir2.x * 1000), l2.end.y + (dir2.y * 1000)]
            ]
        );
        let newVerts;
        if (!origin) {
            // scuffed way to get a point inbetween the two selected lines if parallel
            origin = new THREE.Vector3();
            (new THREE.Line3(l1.start, l2.start)).getCenter(origin);
        } else {
            origin = (new THREE.Vector3()).fromArray(origin);
        }
        console.log(origin, bisector);
        newVerts = findLineLimits(origin, bisector);
        console.log(newVerts);

        createNewEdge(newVerts[0], newVerts[1]);

    }

    function foldAxiom4(p1, l1) {
        let foldDir = new THREE.Vector3();

        let lineDir = new THREE.Vector3();
        l1.delta(lineDir);
        foldDir.crossVectors(lineDir, new THREE.Vector3(0, 0, 1)).normalize();

        let newVerts = findLineLimits(p1, foldDir);
        createNewEdge(newVerts[0], newVerts[1]);
    }

    function foldAxiom5() {
        console.warn("Axiom 5 not implemented");
    }

    function foldAxiom6() {
        console.warn("Axiom 6 not implemented");
    }

    function foldAxiom7(p1, l1, l2) {
        let lineTwoDir = new THREE.Vector3();
        l2.delta(lineTwoDir);
        let pointOnLine = FOLD.geom.segmentIntersectSegment(
            [
                [p1.x - (lineTwoDir.x * 2000), p1.y - (lineTwoDir.y * 2000)],
                [p1.x + (lineTwoDir.x * 2000), p1.y + (lineTwoDir.y * 2000)]
            ],
            [
                [l1.start.x, l1.start.y],
                [l1.end.x, l1.end.y]
            ]
        );
        foldAxiom2(p1, new THREE.Vector3(pointOnLine[0], pointOnLine[1], 0));
    }

    function round(num, eps = 0.001) {
        let roundUp = (Math.ceil(num) - num) < eps;
        let roundDown = (num - Math.floor(num)) < eps;
        if (roundUp || roundDown) {
            return Math.round(num);
        } else {
            return num;
        }
    }

    /**
     * Takes the last value off of an array if it is zero
     * @param {Array} array Any array of integer values
     * @returns A new array with the last value taken out if it was zero
     */
    function stripLastZero(array) {
        let newArr = [];
        for (let i = 0; i < array.length - 1; i++) {
            newArr.push(array[i]);
        }
        let last = array.pop();
        if (last) {
            newArr.push(last);
        }
        return newArr;
    }

    // from https://stackoverflow.com/a/16436975
    function arraysEqual(a, b) {
        if (a == null || b == null || a == undefined || b == undefined) return false;
        if (a === b) return true;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    /**
     * TODO: useless helper now, go back and replace w/ THREE lib function
     * maybe not useless? fromArray doesn't seem to work with arrays of 2 values
     * @param {Array} array An array of number values
     */
    function arrayToVector3(array) {
        let outVector = new THREE.Vector3();
        let x = array[0];
        let y = array[1];
        let z = array[2];
        if (x) outVector.x = x;
        if (y) outVector.y = y;
        if (z) outVector.z = z;
        return outVector;
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
                outArray = outArray.concat(point);
                outArray.pop();
            } else {
                outArray = outArray.concat(point);
            }
        }
        return outArray;
    }
}

window.onload = function() {
    main();
}