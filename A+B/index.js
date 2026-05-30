/*
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Detect mode
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) { document.body.classList.remove('desktop'); document.body.classList.add('mobile'); } 
      else { document.body.classList.remove('mobile'); document.body.classList.add('desktop'); }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode(); mql.addListener(setMode);
  } else { document.body.classList.add('desktop'); }

  var viewerOpts = { controls: { mouseViewMode: data.settings.mouseViewMode } };
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);
    var scene = viewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });

    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });
    return { data: data, scene: scene, view: view };
  });

  // Switch Scene Logic (Safety checked)
  function switchScene(scene) {
    if (!scene) return;
    viewer.stopMovement();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  // Link Hotspot Element Creator (Safety checked)
  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot');
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');
    icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';

    wrapper.addEventListener('click', function() {
      if (hotspot.urlTarget) {
        window.location.href = hotspot.urlTarget;
      } else {
        var targetScene = findSceneById(hotspot.target);
        if (targetScene) switchScene(targetScene);
      }
    });

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    
    // 防呆檢查：如果目標場景不存在，顯示 title 或預設文字，不直接讀取 null
    var targetData = findSceneDataById(hotspot.target);
    tooltip.innerHTML = (targetData && targetData.name) ? targetData.name : (hotspot.title || "前往下一個區域");

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);
    return wrapper;
  }

  // Info Hotspot Creator
  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'info-hotspot');
    wrapper.innerHTML = '<div class="info-hotspot-header"><div class="info-hotspot-icon-wrapper"><img src="img/info.png" class="info-hotspot-icon"></div><div class="info-hotspot-title-wrapper"><div class="info-hotspot-title">' + hotspot.title + '</div></div><div class="info-hotspot-close-wrapper"><img src="img/close.png" class="info-hotspot-close-icon"></div></div><div class="info-hotspot-text">' + hotspot.text + '</div>';
    
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', function() { wrapper.classList.toggle('visible'); });
    wrapper.querySelector('.info-hotspot-close-wrapper').addEventListener('click', function() { wrapper.classList.remove('visible'); });
    return wrapper;
  }

  function sanitize(s) { return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'); }
  function findSceneById(id) { for (var i = 0; i < scenes.length; i++) { if (scenes[i].data.id === id) return scenes[i]; } return null; }
  function findSceneDataById(id) { for (var i = 0; i < data.scenes.length; i++) { if (data.scenes[i].id === id) return data.scenes[i]; } return null; }

  // 🌟 連點兩下複製座標功能
  panoElement.addEventListener('dblclick', function(event) {
    var rect = panoElement.getBoundingClientRect();
    var coords = viewer.view().screenToCoordinates({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    var msg = "\"yaw\": " + coords.yaw + ",\n\"pitch\": " + coords.pitch;
    var textArea = document.createElement("textarea");
    textArea.value = msg;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    alert("座標已複製：\n" + msg);
  });

  var targetId = window.location.hash.replace('#', '');
  var initialScene = scenes[0];
  if (targetId) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === targetId) {
        initialScene = scenes[i];
        break;
      }
    }
  }
  switchScene(initialScene);
})();
