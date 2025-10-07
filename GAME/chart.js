var lineChartData = {
    labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"], /*X軸のラベル*/
    datasets: [{
        label: "レタス",
        backgroundColor: "rgba(255,255,255,0.0)", /*線より下部分の色・透明度。RGBの他、カラーコード、色名でも可*/
        borderColor: "rgba(245,177,46,0.8)", /*線の色・透明度*/
        pointBackgroundColor: "rgba(245,177,46,0.8)", /*点の色・透明度*/
        pointBorderColor: "rgba(245,177,46,0.6)", /*点の線の色*/
        pointHoverBackgroundColor: "white",　/*マウスオーバー時値の点を塗りつぶす色*/
        pointHoverBorderColor: "rgba(245,177,46,0.6)", /*マウスオーバー時値の点の枠線を塗りつぶす色*/
        lineTension: 0,　/*折れ線グラフの時は0に設定必須。でないと曲線になってしまう。*/
        data: [0.76, 0.56, 0.56, 0.54, 0.55, 0.553, 0.799, 0.4805, 0.6341, 0.4420, 0.300112, 0.203233, "0.13", "0.14", "0.13"]
    },
    {
        label: "ニンジン",
        backgroundColor: "rgba(255,255,255,0.0)",
        borderColor: "rgba(25,0,179,0.8)",
        pointBackgroundColor: "rgba(25,0,179,0.8)",
        pointBorderColor: "rgba(25,0,179,0.6)",
        pointHoverBackgroundColor: "white",
        pointHoverBorderColor: "rgba(25,0,179,0.6)",
        lineTension: 0,
        data: [0.77, 0.66, 0.64, 0.64, 0.65, 0.53, 0.599, 0.54805, 0.56341, 0.54420, 0.52300112, 0.5103233, "0.43", "0.314", "0.315"]
    },
    {
        label: "トマト",
        backgroundColor: "rgba(255,255,255,0.0)",
        borderColor: "rgba(173,21,0,0.8)",
        pointBackgroundColor: "rgba(173,21,0,0.8)",
        pointBorderColor: "rgba(173,21,0,0.8)",
        pointHoverBackgroundColor: "white",
        pointHoverBorderColor: "rgba(173,21,0,0.6)",
        lineTension: 0,
        data: [0.87, 0.86, 0.74, 0.74, 0.75, 0.63, 0.699, 0.64805, 0.66341, 0.4820, 0.42300112, 0.3103233, "0.33", "0.214", "0.215"]
    },
    {
        label: "玉ねぎ",
        backgroundColor: "rgba(255,255,255,0.0)",
        borderColor: "rgba(173,21,0,0.8)",
        pointBackgroundColor: "rgba(173,21,0,0.8)",
        pointBorderColor: "rgba(173,21,0,0.8)",
        pointHoverBackgroundColor: "white",
        pointHoverBorderColor: "rgba(173,21,0,0.6)",
        lineTension: 0,
        data: [0.87, 0.86, 0.74, 0.74, 0.75, 0.63, 0.699, 0.64805, 0.66341, 0.4820, 0.42300112, 0.3103233, "0.33", "0.214", "0.215"]
    }
    ]

}

window.onload = function () {
    var ctx = document.getElementById("line").getContext("2d");
    var myLineChart = new Chart(ctx, {
        type: 'line',
        data: lineChartData,
        responsive: true,
        scaleOverride: true,　//メモリ関連の上書き。trueじゃないとメモリの設定ができない。
        scaleFontSize: 15,
        scaleStepWidth: 0.5,　//刻み幅
        scaleSteps: 2 //刻み幅を何回繰り返すか。scaleStepWidth×scaleSteps=縦軸のMAX値。
    });
}