const express = require('express');
const router = express.Router();
const tf = require('@tensorflow/tfjs');
const _ = require('lodash');

function createInputData(data_input) {
    let data = [];
    let data_key = [];
    data_input.forEach((x) => data.push(Object.values(x))); // 인풋 데이터 값
    data_key = Object.keys(data_input[0]);
    console.log('data_input= ', data_input); //입력
    // console.log('data= ', data); //출력
    // console.log('data_key= ', data_key); //출력
    return data;
}

function createOutputData(data_output) {
    let labels = []; // 출력값
    let labels_ = []; // 출력값 생성하기전에
    let id; // '합격' 이 ['합격','불합격', '예비'] 중에서는 0번 인덱스인데 이 인덱스값
    let len; // unique 값 몇개?
    let uniq;
    // one hot step1: array로 변경
    for (let i = 0; i < data_output.length; i++) {
        labels_ = []; // 초기화 => 학교 합격여부 확인
        data_output[i].forEach((x) => labels_.push(Object.values(x)[0]));
        uniq = [...new Set(labels_)]; // unique 값만 찾음
        len = uniq.length; // 그래서.. uniqe 값이 몇개지? 후훗
        // 이제 인풋값들을 one hot으로 바꾼다.
        for (let j = 0; j < data_output[0].length; j++) {
            id = uniq.findIndex((x) => x === labels_[j]);
            labels_[j] = Array(len).fill(0);
            labels_[j][id] = 1;
        }
        labels[i] = labels_;
    }

    console.log('data_output= ', data_output); // 입력
    console.log('labels= ', labels); //출력
    return labels;
}

router.post('/domainCreateModel', async(req, res) => {
    const data_input = req.body.data_input;
    const data_output = req.body.data_output;
    console.log(data_input);
    console.log(data_output);
    let data;
    let data_key;
    let labels;
    let labels_key = [];
    let i;
    data = createInputData(data_input); // input 데이터
    labels = createOutputData(data_output); // output 라벨
    let num_node = Math.max(data[0].length * 2, 32);
    let num_node2 = Math.ceil(num_node / 2);

    let plot_loss = [];
    let plot_val_loss = [];

    // data와 label array 행열 갯수가 반대다. 둘이 서로 transpose임
    console.log('data.length = ', data.length); // 학생 수
    console.log('data[0].length = ', data[0].length); // 항목 수
    console.log('labels.length = ', labels.length); // 결과 갯수
    console.log('labels[0].length = ', labels[0].length); // 학생 수

    const input = tf.input({ shape: [data[0].length] });
    const normalize = tf.layers
        .batchNormalization({
            // betaInitializer: 'glorotNormal',
            // gammaInitializer: 'glorotNormal',
            // movingMeanInitializer: 'glorotNormal',
            // movingVarianceInitializer: 'glorotNormal',
        })
        .apply(input);
    // layer 1
    const dense1 = tf.layers
        .dense({
            units: num_node,
            activation: 'relu',
            kernelInitializer: tf.initializers.glorotNormal({ seed: 13 }),
            biasInitializer: tf.initializers.glorotNormal({ seed: 13 }),
        })
        .apply(normalize);
    // const normalize1 = tf.layers.batchNormalization().apply(dense1);
    // layer 2
    const dense2 = tf.layers
        .dense({
            units: num_node2,
            activation: 'relu',
            kernelInitializer: tf.initializers.glorotNormal({ seed: 13 }),
            biasInitializer: tf.initializers.glorotNormal({ seed: 13 }),
        })
        .apply(dense1);
    // const normalize2 = tf.layers.batchNormalization().apply(dense2);
    //
    const dense = [];
    const output = [];
    for (i = 0; i < labels.length; i++) {
        dense[i] = tf.layers
            .dense({
                units: num_node2,
                activation: 'relu',
                kernelInitializer: tf.initializers.glorotNormal({ seed: 13 }),
                biasInitializer: tf.initializers.glorotNormal({ seed: 13 }),
            })
            .apply(dense2);
        output[i] = tf.layers
            .dense({
                units: labels[i][0].length,
                activation: 'softmax',
                kernelInitializer: tf.initializers.glorotNormal({ seed: 13 }),
                biasInitializer: tf.initializers.glorotNormal({ seed: 13 }),
            })
            .apply(dense[i]);
    }
    const model = tf.model({ inputs: input, outputs: output });
    const Opt = tf.train.adam(0.001);
    const config = {
        optimizer: Opt,
        // loss: "categoricalCrossentropy",
        // loss: "meanSquaredError",
        // metrics: ["acc"],
        loss: tf.losses.meanSquaredError,
        metrics: ['mse', 'accuracy'],
    };

    // compile
    model.compile(config);
    // 트레이닝 시작
    // console.log("training start");
    let data1; // 실제 모델에 들어가는  input데이터 포멧
    let labels1 = []; // 실제 모델에 들어가는 output 데이터 포멧
    data1 = tf.tensor2d(data);
    for (i = 0; i < labels.length; i++) {
        labels1[i] = tf.tensor2d(labels[i]);
    }

    const Num_epoch = Math.max(10, Math.ceil(500 / data.length)); // 얼마나 많은 training을 할지...
    // console.log('Num_epoch= ', Num_epoch);
    // console.log('data1= ', data1);
    // console.log('labels1= ', labels1);
    await model
        .fit(data1, labels1, {
            epochs: Num_epoch,
            batchSize: 16,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: { onEpochEnd },
        })
        .then((info) => {
            onTrainEnd(info);
        });

    console.log('model=', model);
    // ML_Test();
    return res.status(200).json({
        success: true,
        model: model,
    });
    function onBatchEnd(batch, logs) {
        // console.log('Accuracy, batch', logs);
    }

    function onEpochEnd(epoch, logs) {
        let training_progress = Math.round(((epoch + 1) / Num_epoch) * 100);
        console.log('TrainingPrgress', training_progress, '%');
        // console.log(logs);

        plot_loss.push({ y: logs.loss, x: epoch });
        plot_val_loss.push({ y: logs.val_loss, x: epoch });

        // console.log(plot_loss);
        // console.log(plot_val_loss);

        const series = ['loss', 'val_loss'];
        const xy_val = { values: [plot_loss, plot_val_loss], series };
        const surface = { name: 'Loss graph', tab: 'Charts' };
    }

    function onTrainEnd(info) {
        // console.log('Final accuracy', info.history.acc);
        // console.log('Final info', info);
    }
});

router.post('/domainCreateResult', async(req, res) => {
    const model = req.body.model;
    const data_output = req.body.data_output;
    const predict_input = req.body.predict_input;
    console.log("model", model)
    console.log("data_output", data_output)
    console.log("predict_input", predict_input)

    let labels_ = [];
    let title = [];
    let uniq;
    let len;

    let result = [];
    let result_;

  // console.log('output??=', data_output);

    for (let i = 0; i < data_output.length; i++) {
        let result_format = {
        id: 0,
        title: 'University Title!',
        rawData: [],
        };

    labels_ = [];
    data_output[i].forEach((x) => labels_.push(Object.values(x)[0]));
    uniq = [...new Set(labels_)]; // unique 값만 찾음
    len = uniq.length; // 그래서.. uniqe 값이 몇개지? 후훗.
    title[i] = Object.keys(data_output[i][0])[0]; // 그래서 어느대학교라고? 키값을 알아내자

    console.log('uniq=', uniq);
    console.log('title=', title);
    console.log('predict_input=', predict_input);

    result_format.id = i;
    result_format.title = title[i];

    // console.log('result=', result);

    for (let j = 0; j < len; j++) {
        let val;

        if (len < 2) {
            val = await model.predict(tf.tensor2d([predict_input]));
        } else {
            val = await model.predict(tf.tensor2d([predict_input]))[i];
        }
        // console.log('val=', val);

        result_format.rawData.push({
            label: uniq[j],
            confidence: val.dataSync()[j],
        });

      // val.dataSync()[j];
      // console.log(result_format.rawData[j].label, j, len);
      // console.log(val.dataSync()[j]); // val 데이터를 보여줌
      // console.log(val.data().then((x) => console.log(x)));
    }
    result_ = _.cloneDeep(result_format);
    result.push(result_); // 다 많들었으면 밀어넣어
    }
    // console.log("result=", result);
    // return [...result];
    return res.status(200).json({
        success: true,
        result: result,
    });
});

module.exports = router;
