<script>
  import TimePicker  from "../src/index.js";


  let time = new Date();
  $: _time = time.toLocaleTimeString("en-US");





</script>

<style>

  /* :root{
    --svtt-bar-color: #0522f3;
    --svtt-button-color: white;
    --svtt-button-bg-color: #2466fb;
    --svtt-border: none;
    --svtt-button-box-shadow:0 1px 10px -2px #2466fb;
  }   */

 
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
    <TimePicker bind:time />
  </div>
</div>

