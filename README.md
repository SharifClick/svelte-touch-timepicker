# Native like time-picker for Svelte
 
[![NPM version](https://img.shields.io/npm/v/svelte-touch-timepicker.svg?style=flat)](https://www.npmjs.com/package/svelte-touch-timepicker) [![NPM downloads](https://img.shields.io/npm/dm/svelte-touch-timepicker.svg?style=flat)](https://www.npmjs.com/package/svelte-touch-timepicker)


[View the demo.](https://sharifclick.github.io/svelte-touch-timepicker/)

## Installation

```bash
npm i svelte-touch-timepicker
```

## Usage

```html
<script>
  import TimePicker  from "svelte-touch-timepicker"; // 4.38kb gzipped

  let time = new Date();
  $: _time = time.toLocaleTimeString("en-US");

</script>

<style>

  .container{
    height: 100%;
    width: 100%;
  }

  .center {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    font: 20px 'Roboto', sans-serif;
  }
</style>

<div class="container" >
  <div class="center">
    <p>Time: {_time}</p>
    <TimePicer bind:time />
  </div>
</div>

```


## Default css custom properties

```css

  :root{
    --svtt-popup-bg-color: white;
    --svtt-popup-color: black;
    --svtt-popup-radius: 10px;
    --svtt-font-size: 20px;
    --svtt-button-color: black;
    --svtt-button-bg-color: transparent;
    --svtt-border: 1px solid grey;
    --svtt-button-box-shadow: none;
    --svtt-bar-color: grey;
  }
```

## Props

| Name | Type | Description | Required | Default |
| --- | --- | --- | --- | --- |
| `time` | `object` | default date object | yes | `new Date()` |
| `visible` | `Boolean` | Popup visibility | No | `false` |
| `classes` | `String` | custom classes to be add on input | No | `empty string` |