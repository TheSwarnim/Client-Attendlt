import React, { useEffect } from "react";
import * as faceapi from "face-api.js";
import { db } from "../firebase";
import { useStateValue } from "../StateProvider";
import { Redirect, useHistory } from "react-router-dom";
import * as routes from "../constants/routes";

function Enroll() {
  const [{ name, uid, features }, dispatch] = useStateValue();
  const history = useHistory();

  useEffect(() => {
    // const initialSetup = async () => {
    //   if (!name) {
    //     var data = await db.collection("users").doc(uid).get();

    //     if (data.exists) {
    //       data = data.data();

    //       dispatch({
    //         type: "SET_USER",
    //         name: data.name,
    //         collegeId: data.collegeId,
    //         finishedSetup: data.finishedSetup,
    //       });
    //     }
    //   }
    // };
    // initialSetup();

    var video = document.querySelector("#video");

    function stopStream() {
      if (video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();

        tracks.forEach(function (track) {
          track.stop();
        });

        video.srcObject = null;
      } else {
        console.log("Video doesn't have any src");
      }
    }

    const onVideoStarted = async () => {
      console.log("video started");

      const descriptions = [];

      const trainImages = async () => {
        const labeledFaceDescriptors = await new faceapi.LabeledFaceDescriptors(
          name,
          descriptions
        );

        var JSONstringLabeledFaceDescriptors = "";
        const JSONlabeledFaceDescriptors = labeledFaceDescriptors.toJSON();
        JSONstringLabeledFaceDescriptors = JSON.stringify(
          JSONlabeledFaceDescriptors
        );

        await db
          .collection("features")
          .doc(uid)
          .set({
            features: JSONstringLabeledFaceDescriptors,
          })
          .then(() => {
            console.log("data saved");

            dispatch({
              type: "SET_FEATURES",
              features: JSONstringLabeledFaceDescriptors,
            });
          })
          .catch((e) => console.log("Caused a firebase error: ", e));
      };

      const interval = setInterval(async () => {
        // send data to firebase and clear interval after gettting 25 face detections
        if (descriptions.length === 25) {
          try {
            trainImages();

            // stop webcam
            stopStream();
            clearInterval(interval);
          } catch (e) {
            console.log(e);
          }
        }
        if (descriptions.length > 25) {
          stopStream();
          clearInterval(interval);
        }

        try {
          //  save description of images if face detected
          // console.log("interval started");
          const detections = await faceapi
            .detectSingleFace(video)
            .withFaceLandmarks()
            .withFaceDescriptor();

          // console.log(detections);

          if (detections?.descriptor) {
            descriptions.push(detections.descriptor);
            console.log(descriptions.length);
          }
        } catch (e) {
          console.log(e);
        }
      }, 100);
    };

    if (!features) {
      const startVideo = () => {
        var constraints = {
          audio: false,
          video: true,
        };

        if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia(constraints)
            .then((stream) => {
              video.srcObject = stream;
              video.onloadedmetadata = (e) => video.play();
            })
            .catch(function (err) {
              console.log(err.name + ": " + err.message);
            });
        }
      };

      Promise.all([
        faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
      ])
        .then(startVideo)
        .catch((err) => console.log(err));

      // start detecting faces and save them after getting src from webcam

      video.addEventListener("playing", onVideoStarted);
    }
    // else {
    //   stopStream();
    //   history.push(routes.HOME);
    // }

    return () => {
      if (video) {
        video.removeEventListener("playing", onVideoStarted);
      }
      history.push(routes.HOME);
    };
  }, [features, dispatch, name, uid, history]);

  return features ? (
    <Redirect to={routes.HOME} />
  ) : (
    <div>
      <video autoPlay={true} muted={true} id="video" />
    </div>
  );
}

export default Enroll;
