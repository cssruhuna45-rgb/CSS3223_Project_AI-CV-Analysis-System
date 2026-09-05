# AI and Machine Learning Interview Knowledge Guide

```yaml
job_field: ai_machine_learning
job_field_name: AI / Machine Learning
canonical_topics:
  - ml_overview
  - python_for_ml
  - numpy
  - pandas
  - statistics
  - probability
  - data_preprocessing
  - feature_engineering
  - supervised_learning
  - unsupervised_learning
  - regression
  - classification
  - clustering
  - model_evaluation
  - cross_validation
  - overfitting
  - underfitting
  - regularization
  - feature_selection
  - neural_networks
  - deep_learning
  - natural_language_processing
  - computer_vision
  - model_deployment
  - mlops
  - model_monitoring
  - responsible_ai
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **ai_machine_learning**
job field. It owns statistics and probability for ML, preprocessing and feature
engineering, supervised and unsupervised learning, evaluation methodology, neural networks
and deep learning, NLP and computer vision, deployment and MLOps, and responsible AI. Data
pipeline and warehouse depth lives in the data engineering guide; serving infrastructure
depth lives in the DevOps/Cloud guide.

---

## 1. Job Field Overview

```yaml
job_field: ai_machine_learning
topic: ml_overview
difficulty: easy
keywords: [machine_learning, ai, model, training, inference, responsibilities, workflow]
```

Machine learning builds systems that improve their performance on a task by learning
patterns from data rather than being explicitly programmed with rules. **Artificial
intelligence is the broader field**; machine learning is one approach within it, and
**deep learning is a subset of machine learning** using multi-layer neural networks.
Collapsing these three is a reliable indicator of shallow understanding.

The end-to-end workflow an interviewer expects a candidate to know:

1. Frame the problem — is machine learning even the right tool, and what decision does the
   output drive?
2. Define the target variable and the evaluation metric tied to the business objective.
3. Gather, explore, and clean the data.
4. Engineer features and split the data correctly.
5. Establish a baseline (a trivial model or a heuristic).
6. Train and tune candidate models.
7. Evaluate honestly on held-out data.
8. Deploy, monitor, and retrain.

**The most common professional failure is not model choice; it is data leakage,
inappropriate metrics, or a train/serve mismatch.** Interviews at every level probe this.

---

## 2. Core Competencies

```yaml
job_field: ai_machine_learning
topic: core_competencies
difficulty: easy
keywords: [competencies, ml_skills, evaluation]
```

1. **Python for data work** — clean code, environments, testing, and the scientific stack.
2. **NumPy** — arrays, vectorisation, broadcasting, shapes.
3. **Pandas** — loading, joining, grouping, reshaping, missing data.
4. **Statistics and probability** — distributions, sampling, hypothesis testing,
   correlation versus causation.
5. **Data preprocessing** — missing values, encoding, scaling, outliers, imbalance.
6. **Feature engineering and selection** — deriving signal, avoiding leakage.
7. **Supervised learning** — linear and tree-based models, ensembles, and when each fits.
8. **Unsupervised learning** — clustering, dimensionality reduction, anomaly detection.
9. **Evaluation methodology** — metric choice, cross-validation, calibration, error
   analysis.
10. **The bias–variance trade-off** — diagnosing and treating overfitting and underfitting.
11. **Neural networks and deep learning** — architectures, training dynamics,
    regularisation.
12. **NLP and computer vision** — the concepts and standard approaches in each.
13. **Deployment and MLOps** — serving, versioning, reproducibility, monitoring, retraining.
14. **Responsible AI** — fairness, transparency, privacy, and honest communication of
    limitations.

---

## 3. Foundational Knowledge

### 3.1 Python, NumPy, and Pandas for Machine Learning

```yaml
job_field: ai_machine_learning
topic: python_for_ml
difficulty:
  - easy
  - medium
keywords: [python, numpy, pandas, vectorization, broadcasting, dataframe, groupby, missing_data]
```

**NumPy** provides the n-dimensional array that the whole scientific stack builds on.

- **Vectorisation.** Operations execute in compiled code over whole arrays. A Python
  `for` loop over array elements is typically orders of magnitude slower and is the first
  thing to look for in slow data code.
- **Broadcasting.** Arrays of different shapes are aligned automatically when dimensions
  are compatible (equal, or one of them is 1). Understanding broadcasting rules prevents
  both silent wrong results and shape errors.
- **Views versus copies.** Slicing a NumPy array usually returns a view; mutating it
  changes the original. This surprises people and causes hard-to-trace bugs.
- **dtype matters** for memory and precision; `float32` halves memory versus `float64` and
  is standard in deep learning.

**Pandas** provides labelled tabular data structures.

- **Series and DataFrame**, with an index that aligns operations automatically — powerful
  and a frequent source of confusion when indexes do not match.
- **Core verbs.** `read_csv`/`read_parquet`, `merge`, `groupby().agg()`, `pivot_table`,
  `melt`, `apply`, `assign`.
- **Missing data.** `NaN` propagates through arithmetic; `isna`, `fillna`, and `dropna`
  handle it, and the choice among them is a modelling decision, not a formatting one.
- **`SettingWithCopyWarning`** signals an ambiguous chained assignment that may not modify
  what you think; use `.loc` explicitly.
- **Performance.** `apply` with a Python function is slow; prefer vectorised operations or
  built-in aggregations. For large data, move to a distributed engine rather than a bigger
  machine.

### 3.2 Statistics for Machine Learning

```yaml
job_field: ai_machine_learning
topic: statistics
difficulty:
  - easy
  - medium
  - hard
keywords: [mean, median, variance, distribution, sampling, hypothesis_test, p_value, correlation, causation]
```

- **Central tendency and spread.** Mean is sensitive to outliers; median is robust. Report
  both, plus variance or standard deviation, plus the shape of the distribution.
- **Distributions.** Normal (many natural measurements, and the basis of many tests),
  Bernoulli and binomial (binary outcomes), Poisson (counts per interval), exponential
  (waiting times), and heavy-tailed distributions common in real user data where the mean is
  a poor summary.
- **Central limit theorem.** The distribution of the sample mean approaches normal as
  sample size grows, regardless of the underlying distribution. This is what makes
  confidence intervals on means possible.
- **Law of large numbers.** Sample statistics converge to population values with more data.
- **Sampling and bias.** A model can only learn from the population it was sampled from.
  Selection bias, survivorship bias, and non-response bias are modelling problems, not
  statistical footnotes.
- **Hypothesis testing.** A p-value is the probability of observing data at least as
  extreme as yours *if the null hypothesis were true*. It is **not** the probability that
  the null hypothesis is true, and statistical significance is not practical significance.
  Multiple comparisons inflate false positives and need correction.
- **Confidence intervals** communicate uncertainty far better than a point estimate and are
  usually the better thing to report.
- **Correlation is not causation.** Confounding variables, reverse causality, and selection
  effects all produce correlation without causation. Establishing causality requires a
  randomised experiment or a careful causal-inference design.
- **Simpson's paradox.** A trend present in every subgroup can reverse when the groups are
  combined. Always check whether an aggregate conclusion survives disaggregation.

### 3.3 Probability Fundamentals

```yaml
job_field: ai_machine_learning
topic: probability
difficulty:
  - medium
  - hard
keywords: [probability, conditional, bayes, independence, expectation, likelihood, prior]
```

- **Conditional probability** `P(A|B)` — the probability of A given B is known.
- **Independence** — `P(A∩B) = P(A)P(B)`. Many models assume independence that the data
  does not have; naive Bayes is explicit about it, and it often works anyway.
- **Bayes' theorem** — `P(A|B) = P(B|A)P(A)/P(B)`. The practical lesson is the **base rate**:
  a test with 99% accuracy for a condition affecting 1 in 10,000 people produces
  overwhelmingly false positives. This is directly relevant to fraud detection, medical
  screening, and anomaly detection, and is a favourite interview question.
- **Expectation and variance** of a random variable, and why expected value alone is a poor
  decision criterion when the variance is large or the loss is asymmetric.
- **Likelihood versus probability.** Probability treats parameters as fixed and data as
  random; likelihood treats data as fixed and evaluates parameters. Maximum likelihood
  estimation underlies logistic regression and much of classical ML.
- **Prior, likelihood, posterior** — the Bayesian framing, and why priors matter most when
  data is scarce.

---

## 4. Core Technical Topics

### 4.1 Data Preprocessing

```yaml
job_field: ai_machine_learning
topic: data_preprocessing
difficulty:
  - easy
  - medium
  - hard
keywords: [missing_values, encoding, scaling, outliers, imbalance, leakage, pipeline]
```

**Missing values.** First ask *why* they are missing — missing completely at random,
missing at random given observed variables, or missing not at random (the missingness
itself carries information). Options: drop rows (loses data, biases if not random), drop the
column, impute with mean/median/mode (simple, shrinks variance), model-based imputation, or
add an explicit "is missing" indicator alongside the imputed value. Tree-based models can
often handle missingness natively.

**Categorical encoding.**

- **One-hot encoding** — one binary column per category. Safe and interpretable; explodes
  dimensionality with high cardinality.
- **Ordinal / label encoding** — integer per category. Correct only when the categories
  genuinely have an order; otherwise it imposes a false numeric relationship on linear
  models. Tree models tolerate it better.
- **Target / mean encoding** — replace the category with a statistic of the target. Powerful
  and **a leading cause of leakage**; it must be computed within cross-validation folds with
  smoothing.
- **Hashing and embeddings** — for very high cardinality.

**Scaling.** Standardisation (zero mean, unit variance) and min-max normalisation matter for
distance- and gradient-based methods: KNN, SVM, k-means, PCA, linear models with
regularisation, and neural networks. Tree-based models are invariant to monotonic feature
scaling and do not need it.

**Outliers.** Detect with the interquartile range, z-scores, or model-based methods. Decide
deliberately: remove (only if genuinely erroneous), cap/winsorise, transform (log), or use a
robust model. Deleting inconvenient extremes is data manipulation, not cleaning.

**Class imbalance.** Options: class weights in the loss (usually the first thing to try),
resampling (oversampling the minority, undersampling the majority, or synthetic methods
such as SMOTE), threshold adjustment, and choosing a metric that is not accuracy. Critically
— **resampling must happen inside the cross-validation fold, on training data only.**
Oversampling before splitting leaks minority examples into the validation set and produces
excellent, meaningless scores.

**Preprocessing must be fitted on training data only** and applied to validation and test
data using those fitted parameters. A scikit-learn `Pipeline` enforces this structurally,
which is why it is the recommended pattern rather than a stylistic preference.

### 4.2 Feature Engineering and Selection

```yaml
job_field: ai_machine_learning
topic: feature_engineering
difficulty:
  - medium
  - hard
keywords: [feature_engineering, feature_selection, leakage, interaction, domain_knowledge, dimensionality]
```

**Feature engineering** creates input representations that make the signal learnable.
Historically it is where most of the accuracy gain in tabular problems comes from — often
more than model choice.

Common techniques: aggregations over entities and time windows, ratios and differences,
date decomposition (day of week, month, holiday flags, time since last event), text
statistics, binning, interaction terms, and domain-specific derived quantities.

**Data leakage is the dominant risk.** Leakage is using information at training time that
would not be available at prediction time. Forms:

- **Target leakage** — a feature that is a consequence of the target (for example,
  "number_of_collection_letters_sent" when predicting default).
- **Temporal leakage** — using future information for a past prediction, including
  aggregations computed over the whole dataset.
- **Train/test contamination** — fitting scalers, imputers, encoders, or feature selection
  on the full dataset before splitting.
- **Duplicate or near-duplicate records** split across train and test.

The diagnostic symptom is a suspiciously excellent validation score that collapses in
production. **A cross-validation score that seems too good is a bug hypothesis, not a
success.**

**Feature selection methods.**

- **Filter** — statistical relevance (correlation, mutual information, chi-square)
  computed independently of the model. Fast, ignores interactions.
- **Wrapper** — search over feature subsets by training models (recursive feature
  elimination). Accurate, expensive, and prone to overfitting the validation set.
- **Embedded** — the model performs selection: L1 regularisation drives coefficients to
  zero; tree ensembles produce importance scores.

**Feature importance caveats.** Impurity-based importances in tree models are biased toward
high-cardinality features. Permutation importance is more reliable but misleading when
features are correlated. SHAP values give consistent local and global attributions and are
the current standard for explanation — though they explain the *model*, not the world.

**The curse of dimensionality.** As dimensions increase, data becomes sparse, distances
become less meaningful, and the sample size needed for reliable estimation grows sharply.
More features are not automatically better.

### 4.3 Supervised Learning — Regression

```yaml
job_field: ai_machine_learning
topic: regression
difficulty:
  - easy
  - medium
  - hard
keywords: [linear_regression, ols, assumptions, mse, mae, r2, multicollinearity, residuals]
```

Regression predicts a continuous target.

**Linear regression** fits a linear combination of features by minimising squared error. Its
value in interviews is that its assumptions are explicit and testable: linearity of the
relationship, independence of errors, homoscedasticity (constant error variance), and
approximately normal residuals for inference. Violations do not always break prediction but
do break confidence intervals and p-values.

- **Multicollinearity** (correlated predictors) inflates coefficient variance and makes
  individual coefficients uninterpretable while leaving overall predictions usable. Detect
  with the variance inflation factor; address with removal, combination, or regularisation.
- **Residual plots** are the primary diagnostic: structure in residuals means the model is
  missing something.

**Metrics.**

- **MSE / RMSE** — penalises large errors quadratically; RMSE is in the target's units.
- **MAE** — linear penalty, robust to outliers, and the right choice when large errors are
  not disproportionately bad.
- **R²** — proportion of variance explained. It never decreases when you add features, which
  is why adjusted R² exists; and a high R² does not mean the model is useful out of sample.
- **MAPE** — percentage error, undefined at zero and asymmetric; use with care.

**Other regressors.** Polynomial regression (linear model on transformed features, prone to
overfitting at high degree), regularised variants (ridge, lasso, elastic net), tree-based
regressors, and gradient boosting — which is usually the strongest off-the-shelf performer
on tabular data.

### 4.4 Supervised Learning — Classification

```yaml
job_field: ai_machine_learning
topic: classification
difficulty:
  - easy
  - medium
  - hard
keywords: [logistic_regression, decision_tree, random_forest, gradient_boosting, svm, knn, naive_bayes]
```

Classification predicts a discrete label. Models an interviewer expects a candidate to
compare:

- **Logistic regression.** Linear model producing calibrated probabilities via the sigmoid.
  Interpretable coefficients (log-odds), fast, a strong baseline, and often the right answer
  when explainability is a requirement. Limited to linear decision boundaries unless
  features are engineered.
- **Decision tree.** Recursive splits on features. Highly interpretable and needs no
  scaling; unstable and prone to overfitting without depth or leaf-size constraints.
- **Random forest.** Bagging plus random feature subsets across many trees. Reduces variance
  substantially, robust, few hyperparameters to get wrong, and hard to overfit by adding
  more trees. Less interpretable and larger to serve.
- **Gradient boosting** (XGBoost, LightGBM, CatBoost). Sequentially fits trees to the
  residual errors of the ensemble. Generally the strongest performer on tabular data;
  sensitive to hyperparameters and **can** overfit with too many boosting rounds, which is
  why early stopping on a validation set matters.
- **Support Vector Machine.** Maximum-margin separator, with kernels for non-linear
  boundaries. Effective in high dimensions with limited samples; scales poorly to very large
  datasets and requires scaling.
- **K-Nearest Neighbours.** No training phase; predicts from the closest examples. Simple
  and intuitive; expensive at inference, sensitive to scaling and to the curse of
  dimensionality.
- **Naive Bayes.** Applies Bayes' theorem with a conditional-independence assumption. Very
  fast, works surprisingly well for text classification, and its probability estimates are
  usually poorly calibrated.

**Bagging versus boosting.** Bagging trains models in parallel on bootstrap samples and
averages, primarily reducing **variance**. Boosting trains models sequentially, each
correcting the previous ensemble's errors, primarily reducing **bias**. Stacking combines
heterogeneous models with a meta-learner.

**Model selection heuristics.** Start with a trivial baseline, then logistic regression or a
small tree for interpretability, then gradient boosting for tabular performance. Reach for
deep learning when the data is unstructured (text, images, audio) or very large, not by
default on a 10,000-row table.

### 4.5 Unsupervised Learning

```yaml
job_field: ai_machine_learning
topic: unsupervised_learning
difficulty:
  - medium
  - hard
keywords: [clustering, kmeans, dbscan, hierarchical, pca, dimensionality_reduction, anomaly_detection]
```

Unsupervised learning finds structure without labelled targets.

**K-means.** Partitions data into k clusters by minimising within-cluster variance.
Requires choosing k in advance (elbow method on inertia, or silhouette score), assumes
roughly spherical clusters of similar size, is sensitive to initialisation (k-means++
mitigates), sensitive to feature scaling, and sensitive to outliers.

**Hierarchical clustering.** Builds a dendrogram by successively merging or splitting; no
need to pick k upfront and gives a full structure, but is `O(n²)` or worse in memory and
time.

**DBSCAN.** Density-based; finds arbitrarily shaped clusters, identifies outliers as noise,
and does not need k. Struggles when cluster densities vary widely and requires tuning
`eps` and `min_samples`.

**Evaluating clustering** is genuinely hard without labels: silhouette score, Davies–Bouldin
index, and stability across resampling. Ultimately clusters must be validated by whether
they are useful and interpretable to a domain expert.

**Dimensionality reduction.**

- **PCA** projects onto orthogonal directions of maximum variance. Linear, fast,
  deterministic, and interpretable via explained-variance ratio. Requires scaling, and
  components are combinations of features, which reduces interpretability.
- **t-SNE and UMAP** are non-linear techniques for visualisation. Critically, **distances
  between clusters in a t-SNE plot are not meaningful**, and the layout changes with
  hyperparameters — treating a t-SNE picture as ground truth is a common error.
- **Autoencoders** learn a compressed representation with a neural network, useful for
  non-linear reduction and anomaly detection.

**Anomaly detection.** Statistical thresholds, isolation forests, one-class SVM, or
reconstruction error from an autoencoder. The recurring practical problem is the base rate:
with rare anomalies, even a low false-positive rate produces mostly false alarms.

### 4.6 Model Evaluation and Metrics

```yaml
job_field: ai_machine_learning
topic: model_evaluation
difficulty:
  - easy
  - medium
  - hard
keywords: [accuracy, precision, recall, f1, roc_auc, pr_auc, confusion_matrix, calibration, threshold]
```

**Choosing the metric is a business decision**, and getting it wrong invalidates everything
downstream.

**Confusion matrix** — true positives, false positives, true negatives, false negatives.
Every classification metric derives from it.

- **Accuracy** = correct ÷ total. **Misleading under class imbalance**: predicting "not
  fraud" always gives 99.9% accuracy on a 0.1% fraud dataset.
- **Precision** = TP ÷ (TP + FP). Of the things I flagged, how many were right. Optimise
  when false positives are costly (spam filtering, blocking a legitimate transaction).
- **Recall / sensitivity** = TP ÷ (TP + FN). Of the real positives, how many did I catch.
  Optimise when false negatives are costly (disease screening, fraud, safety).
- **F1** — harmonic mean of precision and recall. A convenient single number that hides the
  trade-off you may need to see.
- **Specificity** = TN ÷ (TN + FP).
- **ROC-AUC** — ranking quality across all thresholds. Threshold-independent and useful for
  comparing models, but **optimistic under heavy imbalance** because the large negative class
  keeps the false-positive rate low.
- **PR-AUC (average precision)** — more informative than ROC-AUC when positives are rare.
- **Log loss / cross-entropy** — penalises confident wrong predictions; the right metric
  when you need probabilities rather than labels.

**Threshold selection.** A classifier outputs a score; the 0.5 cut-off is a default, not a
decision. Choose the threshold from the cost of each error type, or from an operational
constraint such as "we can only investigate 200 cases a day".

**Calibration.** A well-calibrated model's 0.7 predictions are correct about 70% of the
time. Tree ensembles and naive Bayes are often poorly calibrated; Platt scaling or isotonic
regression corrects this. Calibration matters whenever the probability itself feeds a
decision or an expected-value calculation.

**Regression metrics** are covered in section 4.3. **Ranking and recommendation** use
precision@k, recall@k, NDCG, and MAP.

**Error analysis beats metric-chasing.** Segment errors by feature values, class, and time.
A model with 92% accuracy that fails systematically for one customer segment is not a 92%
model for that segment.

### 4.7 Overfitting, Underfitting, and Regularisation

```yaml
job_field: ai_machine_learning
topic: overfitting
difficulty:
  - easy
  - medium
  - hard
keywords: [overfitting, underfitting, bias_variance, regularization, l1, l2, dropout, early_stopping]
```

**Overfitting** — the model learns noise specific to the training data; training error is
low and validation error is high, and the gap widens with training.

**Underfitting** — the model is too simple to capture the signal; both training and
validation error are high.

**The bias–variance trade-off.** Bias is error from wrong assumptions (too simple); variance
is error from sensitivity to the particular training sample (too complex). Total expected
error decomposes into bias², variance, and irreducible noise. Increasing model complexity
lowers bias and raises variance.

**Treatments for overfitting**, roughly in order of what to try:

1. **More data** — the most effective and least available remedy.
2. **Regularisation.** **L2 (ridge)** shrinks coefficients smoothly and handles correlated
   features well. **L1 (lasso)** drives some coefficients to exactly zero, performing
   feature selection. **Elastic net** combines both.
3. **Reduce complexity** — fewer features, shallower trees, fewer parameters.
4. **Early stopping** on a validation set — essential for boosting and neural networks.
5. **Ensembling** — bagging averages out variance.
6. **For neural networks** — dropout (randomly zeroing activations during training),
   weight decay, batch normalisation, and data augmentation.
7. **Cross-validation** to get an honest estimate before you act.

**Treatments for underfitting.** More expressive model, better features, less
regularisation, longer training.

**Learning curves** (error versus training set size) distinguish the two: converging high
errors indicate bias; a persistent gap indicates variance, and more data will help.

### 4.8 Validation Strategy and Cross-Validation

```yaml
job_field: ai_machine_learning
topic: cross_validation
difficulty:
  - medium
  - hard
keywords: [train_test_split, k_fold, stratified, time_series_split, group_split, nested_cv, leakage]
```

**Train, validation, test.** Train fits parameters; validation guides model and
hyperparameter choice; test is touched **once** to estimate generalisation. Repeatedly
tuning against the test set turns it into a second validation set and the reported number
becomes optimistic.

**K-fold cross-validation** partitions data into k folds, training on k−1 and validating on
the remainder, then averaging. It uses data efficiently and gives a variance estimate across
folds. **Stratified k-fold** preserves class proportions and should be the default for
classification.

**Splitting must respect the data's structure.**

- **Time series** — never shuffle. Use forward-chaining or expanding-window splits so
  training always precedes validation in time. A random split on temporal data leaks the
  future and produces excellent, worthless scores.
- **Grouped data** — when multiple rows belong to one entity (patient, user, session), split
  by group. Otherwise the same entity appears in train and validation, and the model
  memorises the entity rather than learning the pattern.
- **Imbalanced data** — stratify, and be aware that with very few positives, fold-level
  metrics are noisy.

**Nested cross-validation** puts hyperparameter search inside an outer evaluation loop,
giving an unbiased performance estimate when you are both tuning and evaluating. It is
expensive, and skipping it is a defensible trade-off you should be able to articulate.

**Hyperparameter search.** Grid search is exhaustive and expensive; random search is
usually more efficient for the same budget; Bayesian optimisation is more sample-efficient
for expensive training runs. Always with the same fold structure, and always with
preprocessing inside the pipeline.

### 4.9 Neural Networks and Deep Learning

```yaml
job_field: ai_machine_learning
topic: deep_learning
difficulty:
  - medium
  - hard
keywords: [neural_network, backpropagation, activation, gradient_descent, cnn, rnn, transformer, dropout]
```

**A neural network** is a composition of layers of weighted sums followed by non-linear
activations, trained by gradient descent on a loss function. **Deep learning is machine
learning with many-layer neural networks** — a subset, not a synonym.

**Training mechanics.**

- **Forward pass** computes predictions; the **loss** measures error; **backpropagation**
  applies the chain rule to compute gradients; the **optimiser** updates weights.
- **Optimisers.** SGD with momentum is well understood and generalises well; Adam adapts
  per-parameter learning rates and converges faster with less tuning. AdamW decouples
  weight decay and is a common default.
- **Learning rate is the most important hyperparameter.** Too high diverges; too low
  crawls or gets stuck. Schedules (warmup, cosine decay, step decay) matter in practice.
- **Batch size** affects gradient noise, memory use, and generalisation; very large batches
  often need learning rate scaling.
- **Activations.** ReLU is the standard hidden-layer default (cheap, mitigates vanishing
  gradients, can produce dead units); variants such as leaky ReLU and GELU address specific
  issues. Sigmoid for binary output, softmax for multi-class output.
- **Vanishing and exploding gradients.** Addressed by careful initialisation, normalisation
  layers, residual connections, and gradient clipping.
- **Regularisation in deep nets.** Dropout, weight decay, early stopping, data augmentation,
  and batch or layer normalisation (which also stabilises and accelerates training).

**Architectures.**

- **Feedforward / MLP** — tabular and general-purpose. Rarely beats gradient boosting on
  tabular data, which is a legitimate and frequently correct thing to say.
- **CNN (convolutional)** — exploits spatial locality and translation invariance through
  shared filters; the classical backbone for images.
- **RNN / LSTM / GRU** — sequential processing with hidden state; superseded by
  transformers for most language tasks but still used where strict streaming or small
  models matter.
- **Transformer** — self-attention lets every position attend to every other, enabling
  parallel training over sequences and long-range dependencies. It is the architecture
  underpinning modern large language models and increasingly vision models too.

**When deep learning is the wrong choice.** Small tabular datasets, hard interpretability
requirements, tight latency or compute budgets, and problems where a well-engineered
gradient boosting model already meets the requirement. Saying this is a maturity signal.

**Transfer learning** — start from a model pretrained on a large corpus and fine-tune on
your smaller dataset. It is the practical default in NLP and vision, and it is what makes
deep learning feasible without enormous data.

### 4.10 Natural Language Processing

```yaml
job_field: ai_machine_learning
topic: natural_language_processing
difficulty:
  - medium
  - hard
keywords: [nlp, tokenization, embeddings, tfidf, transformer, llm, fine_tuning, rag, evaluation]
```

- **Text preprocessing.** Tokenisation, normalisation (case, accents), stop-word removal,
  stemming versus lemmatisation. Modern transformer pipelines use subword tokenisation
  (BPE, WordPiece, SentencePiece) and skip most classical preprocessing.
- **Classical representations.** Bag of words and **TF-IDF** weight terms by frequency in
  the document against rarity across the corpus. Sparse, interpretable, and still a strong
  baseline for topic and document classification.
- **Word embeddings.** Word2Vec, GloVe, and FastText map words to dense vectors capturing
  distributional similarity. Static: one vector per word regardless of context.
- **Contextual embeddings.** Transformer encoders produce a different vector for a word
  depending on its sentence, which resolves polysemy.
- **Transformer language models.** Encoder models suit classification and retrieval;
  decoder models generate; encoder-decoder models suit translation and summarisation.
- **Large language models.** Pretrained on large corpora and adapted by prompting,
  fine-tuning, or parameter-efficient fine-tuning (such as LoRA). Key practical concepts:
  context window limits, tokenisation cost, temperature and sampling, and the fact that
  fluent output is not evidence of correctness.
- **Retrieval-Augmented Generation (RAG).** Retrieve relevant documents from a vector store
  using embedding similarity, then condition generation on them. It grounds answers in a
  controllable corpus, reduces (but does not eliminate) fabrication, and allows updating
  knowledge without retraining. Engineering concerns: chunking strategy, embedding model
  choice, retrieval quality and thresholds, reranking, context window budget, and
  evaluating whether the answer is actually supported by the retrieved text.
- **Hallucination** — a model producing confident, fluent, false content. Mitigations:
  grounding with retrieval, citation and verification, constrained output formats,
  abstention when retrieval confidence is low, and human review for consequential decisions.
- **Evaluation.** Classification metrics for classification tasks; BLEU, ROUGE, and METEOR
  for generation with known references (all weak proxies for quality); embedding-based
  similarity; and human or model-assisted evaluation with an explicit rubric. Evaluating
  open-ended generation is genuinely unsolved, and saying so is correct.

### 4.11 Computer Vision

```yaml
job_field: ai_machine_learning
topic: computer_vision
difficulty:
  - medium
  - hard
keywords: [cnn, convolution, pooling, augmentation, object_detection, segmentation, transfer_learning]
```

- **Convolution** applies a learned filter across the image, exploiting spatial locality
  and sharing parameters, which is why CNNs need far fewer parameters than a fully connected
  network on the same input. **Pooling** downsamples for translation tolerance and reduced
  computation. **Stride, padding, and receptive field** determine spatial dimensions and how
  much context each unit sees.
- **Task types.** Image classification (one label per image), object detection (labels plus
  bounding boxes), semantic segmentation (a class per pixel), instance segmentation (per
  pixel and per object), and keypoint or pose estimation.
- **Data augmentation** — flips, crops, rotations, colour jitter, and mixing techniques.
  It is the primary regulariser in vision and often matters more than architecture choice.
  Augmentations must be semantically valid: horizontally flipping a digit or a road sign can
  change its meaning.
- **Transfer learning** is the norm: take a backbone pretrained on a large image corpus,
  replace the head, and fine-tune. It works with orders of magnitude less data than training
  from scratch.
- **Vision transformers** apply self-attention to image patches and are competitive with or
  better than CNNs at scale, typically requiring more data or stronger augmentation.
- **Practical issues.** Class imbalance in detection, annotation quality and cost, domain
  shift between training images and deployment cameras, image resolution versus compute
  trade-offs, and inference latency on edge devices.

### 4.12 Model Deployment and MLOps

```yaml
job_field: ai_machine_learning
topic: mlops
difficulty:
  - medium
  - hard
keywords: [deployment, serving, batch_inference, model_registry, reproducibility, ci_cd, feature_store]
```

**Deployment patterns.**

- **Batch inference** — score a set of records on a schedule and store the results. Simple,
  cheap, and correct whenever predictions are not needed instantly.
- **Online / real-time inference** — a service responds per request. Adds latency budgets,
  autoscaling, and availability requirements.
- **Streaming inference** — score events as they arrive from a stream.
- **Edge / on-device** — model compressed (quantisation, pruning, distillation) to run
  locally under memory and power constraints.

**What makes an ML system different from a normal service.**

- **Reproducibility requires versioning three things**: code, data, and model artifacts —
  plus the environment and random seeds. Versioning code alone is not reproducibility.
- **Model registry** — versioned model artifacts with metadata, evaluation results, and a
  promotion workflow from staging to production.
- **Training/serving skew** — the feature computation at training time differs from serving
  time. This is one of the most common production failures. A **feature store** or shared
  transformation code prevents it by using one definition for both paths.
- **Experiment tracking** — parameters, metrics, and artifacts recorded per run so results
  are comparable and auditable.
- **CI/CD for ML** — tests on data (schema, distributions), tests on code, automated
  training pipelines, evaluation gates before promotion, and a rollback to the previous
  model version.
- **Shadow deployment and canary** — run the new model alongside the current one on real
  traffic without acting on its output, compare, then shift traffic gradually. **A/B testing**
  measures actual business impact, which offline metrics only approximate.

### 4.13 Model Monitoring and Drift

```yaml
job_field: ai_machine_learning
topic: model_monitoring
difficulty:
  - medium
  - hard
keywords: [drift, data_drift, concept_drift, monitoring, retraining, feedback_loop, ground_truth]
```

**Models degrade even when nothing in the code changes**, because the world changes. This
is the property that most distinguishes ML systems from ordinary software.

- **Data drift (covariate shift)** — the input distribution changes; the relationship
  between inputs and target may still hold.
- **Concept drift** — the relationship between inputs and target changes; the same input now
  implies a different outcome. Fraud patterns and user behaviour drift constantly.
- **Label delay.** Ground truth often arrives weeks later (did the loan default? did the
  customer churn?), so you cannot measure accuracy in real time and must rely on proxy
  signals.

**What to monitor.**

- **Operational** — latency, error rate, throughput, resource usage.
- **Input** — feature distributions versus the training distribution, missing-value rates,
  new categorical values, and out-of-range values.
- **Output** — prediction distribution and the rate of positive predictions; a sudden shift
  is an early warning before ground truth exists.
- **Performance** — accuracy metrics once labels arrive, segmented by cohort.
- **Business** — the downstream metric the model is supposed to move.

**Retraining strategy.** Scheduled retraining is simple and predictable; triggered
retraining on detected drift is more responsive and more complex. Either way, retraining
needs the same evaluation gate as the original model — an automatically retrained model
promoted without validation is a production incident waiting to happen.

**Feedback loops.** When the model's own predictions influence the data it later trains on
(recommendations shaping what users see, fraud blocks removing the label), the model can
reinforce its own biases. Detecting and interrupting this — with exploration, holdout
groups, or explicit counterfactual logging — is a genuinely hard design problem.

### 4.14 Responsible AI

```yaml
job_field: ai_machine_learning
topic: responsible_ai
difficulty:
  - medium
  - hard
keywords: [fairness, bias, explainability, privacy, transparency, accountability, governance]
```

- **Bias in data becomes bias in models.** Historical data encodes historical decisions; a
  model trained on past hiring, lending, or policing outcomes reproduces the patterns in
  them. Removing the protected attribute does not remove the bias, because correlated
  proxies remain.
- **Fairness definitions conflict mathematically.** Demographic parity (equal positive
  rates), equalised odds (equal true and false positive rates), and calibration within
  groups cannot generally all be satisfied simultaneously when base rates differ. Choosing
  which to prioritise is an ethical and legal decision, not a technical one — and knowing
  that they are incompatible is a strong interview signal.
- **Measure before claiming.** Evaluate performance disaggregated by relevant subgroups. An
  aggregate metric hides subgroup failure.
- **Explainability.** Intrinsically interpretable models (linear, small trees, rule sets)
  versus post-hoc explanation (SHAP, LIME, counterfactuals). Post-hoc explanations describe
  the model's behaviour, not the true causal mechanism, and can be unstable. In regulated
  domains an interpretable model is sometimes required outright.
- **Privacy.** Data minimisation, anonymisation and its limits (re-identification from
  quasi-identifiers is well documented), differential privacy for formal guarantees, and
  federated learning to avoid centralising raw data. Models can memorise and leak training
  data, which matters for both privacy and confidentiality.
- **Transparency and documentation.** Model cards and dataset documentation stating intended
  use, training data, evaluation results by subgroup, and known limitations.
- **Human oversight.** For consequential decisions — credit, employment, healthcare,
  criminal justice — a meaningful appeal path and human review, not a rubber stamp.
- **Governance frameworks.** The **NIST AI Risk Management Framework** (Govern, Map,
  Measure, Manage) is a published, non-binding US framework for managing AI risk; the
  **EU AI Act** is binding legislation taking a risk-tiered approach with obligations that
  scale by risk category. Referencing these accurately is legitimate; inventing specific
  compliance requirements is not.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: ai_machine_learning
topic: easy_level_knowledge
difficulty: easy
keywords: [ml_basics, definitions, junior, fundamentals]
```

- **What is machine learning?** Building systems that learn patterns from data rather than
  following explicitly programmed rules.
- **How do AI, machine learning, and deep learning relate?** Deep learning is a subset of
  machine learning, which is a subset of artificial intelligence.
- **What is supervised versus unsupervised learning?** Learning from labelled examples
  versus finding structure in unlabelled data.
- **What is the difference between classification and regression?** Predicting a discrete
  label versus a continuous value.
- **What is a feature and what is a target?** An input variable versus the quantity being
  predicted.
- **What is overfitting?** The model learns noise in the training data and performs poorly
  on new data.
- **What is underfitting?** The model is too simple to capture the underlying pattern.
- **Why do you split data into training and test sets?** To estimate performance on data the
  model has not seen.
- **What is cross-validation?** Repeatedly training and validating on different partitions
  to get a more reliable performance estimate.
- **What is accuracy, and when is it misleading?** Fraction of correct predictions;
  misleading when classes are imbalanced.
- **What are precision and recall?** Correctness of positive predictions versus coverage of
  actual positives.
- **What is a confusion matrix?** A table of true and false positives and negatives.
- **What is linear regression?** Fitting a linear relationship between features and a
  continuous target.
- **What is logistic regression used for?** Binary classification, producing a probability.
- **What does normalisation or standardisation do and why?** Puts features on a comparable
  scale so distance- and gradient-based algorithms behave properly.
- **What is a neural network?** Layers of weighted sums with non-linear activations trained
  by gradient descent.
- **What is NumPy used for and what is Pandas used for?** Efficient numeric array
  computation versus labelled tabular data manipulation.
- **What is one-hot encoding?** Converting a categorical variable into binary indicator
  columns.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: ai_machine_learning
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_ml, metric_selection, model_choice, debugging, comparison]
```

- **Your model has 99% accuracy on fraud detection. Is it good?** Almost certainly not —
  check the class balance, the confusion matrix, precision and recall on the positive class,
  and PR-AUC. Compare against the trivial "always negative" baseline.
- **How do you handle an imbalanced dataset?** Class weights first, then resampling inside
  the fold, threshold tuning, and metric choice. Explain why resampling before splitting
  leaks.
- **When would you choose precision over recall?** When false positives are costly; give a
  concrete example, and note that the threshold, not the model, usually implements the
  choice.
- **How would you detect data leakage?** Suspiciously high validation scores, features
  with implausibly high importance, features whose values are only knowable after the target,
  and a check on whether each feature exists at prediction time.
- **How do you choose between random forest and gradient boosting?** Robustness and few
  hyperparameters versus higher ceiling with careful tuning and early stopping. Mention
  training time and inference cost.
- **Why does a model perform well offline but poorly in production?** Training/serving skew,
  drift, leakage in the offline evaluation, a different population, or a split that did not
  respect time.
- **How do you split time series data for validation?** Forward chaining with strictly
  ordered folds; never random shuffling.
- **What is regularisation and how do L1 and L2 differ?** Penalising complexity; L1 produces
  sparsity and selects features, L2 shrinks smoothly and handles correlated features better.
- **When is PCA appropriate and what does it cost?** Reducing correlated numeric dimensions
  before a distance-based model; costs interpretability, requires scaling, and assumes
  linear structure.
- **How do you choose the number of clusters in k-means?** Elbow on inertia, silhouette
  score, stability across seeds, and — decisively — whether a domain expert finds the
  clusters meaningful.
- **What is the difference between bagging and boosting?** Parallel variance reduction
  versus sequential bias reduction.
- **How do you evaluate a recommendation system?** Offline ranking metrics (precision@k,
  NDCG) as a proxy, then an online A/B test on the business metric, plus coverage and
  diversity.
- **How would you debug a model that is not learning at all?** Verify the data and labels
  first, overfit a tiny subset deliberately to prove the pipeline can learn, then check the
  learning rate, loss function, target encoding, and feature scaling.
- **When should you not use machine learning?** When rules are known and stable, when data
  is insufficient or unrepresentative, when errors are unacceptable and unexplainable, or
  when a simple heuristic already meets the requirement.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: ai_machine_learning
topic: hard_level_knowledge
difficulty: hard
keywords: [ml_system_design, scale, drift, fairness, causality, production_ml, architecture]
```

- **Design an end-to-end fraud detection system.** Label definition and delay, extreme
  imbalance, feature computation consistent between training and serving, latency budget for
  online scoring, threshold tied to investigation capacity, feedback loop where blocked
  transactions never produce labels, adversarial adaptation by fraudsters requiring frequent
  retraining, and the cost asymmetry between blocking a good customer and missing a fraud.
- **A model performs well in aggregate but poorly for one demographic. What do you do?**
  Measure disaggregated performance, investigate representation and label quality in that
  subgroup, consider reweighting or subgroup-specific thresholds, and state explicitly which
  fairness criterion you are optimising and which you are therefore giving up.
- **How do you detect and respond to concept drift when labels arrive 60 days late?**
  Monitor input and output distributions as leading indicators, use proxy labels where
  available, maintain a small rapidly labelled sample, run a champion/challenger setup, and
  define retraining triggers that do not depend on full ground truth.
- **Design an ML platform for many teams.** Feature store for consistent training and
  serving features, experiment tracking, a model registry with promotion gates, standardised
  training and deployment pipelines, monitoring by default, cost attribution, and reproducible
  environments. State what you build first and why.
- **How do you serve a large model under a 50 ms latency budget?** Quantisation, distillation
  into a smaller student model, pruning, batching, caching frequent inputs, hardware
  acceleration, and a smaller model with a fallback escalation path. Then question whether
  real-time inference is required at all.
- **How would you establish that a feature causes the outcome rather than correlating with
  it?** Randomised experiment where feasible; otherwise a causal design (difference in
  differences, instrumental variables, propensity matching) with its assumptions stated. Note
  that predictive models are not causal models, and using model coefficients as causal
  effects is a category error.
- **Explain the trade-offs of building a RAG system versus fine-tuning.** RAG updates
  knowledge without retraining, cites sources, and controls the corpus, but adds retrieval
  infrastructure and depends on retrieval quality. Fine-tuning adapts style, format, and
  domain behaviour, but is expensive to update and cannot easily attribute sources. They are
  complementary, and a common architecture uses both.
- **How do you evaluate a generative model in production?** Task-grounded automatic metrics
  where a reference exists, model-assisted grading with a rubric and human calibration,
  human review on a sampled subset, guardrail checks for policy violations, and business
  outcome metrics. Acknowledge that all automatic metrics for open-ended generation are
  weak.
- **How do you handle a training dataset too large for memory?** Out-of-core and chunked
  processing, distributed training with data parallelism, sampling with a justified
  strategy, and moving feature computation into a distributed engine. Address whether more
  data is even improving the model — check the learning curve.
- **What are the reliability failure modes unique to ML systems?** Silent degradation
  without an error, feedback loops, training/serving skew, upstream data schema changes,
  label pipeline breakage, and dependency on a data source whose semantics change without
  notice.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: ai_machine_learning
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, model_failure, production_ml, debugging, evaluation_problem]
```

### Scenario A — The model performs well in training but poorly in production

Validation accuracy was 94%; production accuracy is 68%.

- **Initial question.** What are the candidate explanations, and how do you distinguish
  them?
- **Expected reasoning.** Data leakage in the offline evaluation, training/serving skew in
  feature computation, distribution shift between the training period and now, a validation
  split that ignored time or grouping, or a different population at inference.
- **Follow-up.** How do you test the leakage hypothesis specifically? (Audit each feature
  for availability at prediction time; check whether a single feature carries implausible
  importance; re-evaluate with a strictly temporal split.)
- **Deeper.** How would you test for training/serving skew? (Log the exact feature vectors
  computed at serving time and compare them to training-time features for the same
  entities.)
- **Trade-off.** Retraining on recent data restores performance quickly but does not fix a
  structural leakage or skew problem, and will fail again.

### Scenario B — Class imbalance destroys the model's usefulness

0.3% of transactions are fraudulent; the model predicts "not fraud" for everything.

- **Expected reasoning.** Accuracy is the wrong metric; use PR-AUC and per-class recall.
  Apply class weights, adjust the decision threshold, and evaluate against the operational
  constraint (how many cases can be reviewed per day).
- **Follow-up.** Would SMOTE help, and what is the risk? (It can help, and it must be applied
  inside the training fold only; synthetic minority points can also create unrealistic
  examples in high dimensions.)
- **Deeper.** How do you choose the threshold? (Expected cost: probability times the cost of
  each error type, bounded by review capacity.)

### Scenario C — Cross-validation scores are excellent but implausible

Five-fold CV reports 0.99 AUC on a difficult problem.

- **Expected reasoning.** Treat it as a bug. Check for duplicate rows across folds, a
  leaked target-derived feature, preprocessing fitted before splitting, target encoding
  outside the fold, or grouped data split randomly.
- **Follow-up.** How do you confirm? (Ablate suspicious features one at a time; if removing
  one collapses the score to plausible levels, investigate it.)
- **Deeper.** Why is this more dangerous than a model that scores poorly? (A bad score
  prompts investigation; a great score gets deployed.)

### Scenario D — The model's predictions have drifted over six months

Accuracy has declined gradually with no code change.

- **Expected reasoning.** Compare current input distributions to training distributions per
  feature, check for new categorical values and changed upstream semantics, distinguish data
  drift from concept drift, and check whether an upstream pipeline changed.
- **Follow-up.** How do you decide between retraining and rebuilding? (Retrain if the
  relationship holds and only the distribution moved; rebuild features or reframe if the
  relationship itself changed.)
- **Deeper.** How do you prevent silent degradation next time? (Drift monitoring on inputs
  and outputs, alerting on the prediction rate, and a scheduled evaluation once labels
  arrive.)

### Scenario E — A stakeholder asks why the model rejected a specific application

- **Expected reasoning.** Local explanation with SHAP or a counterfactual ("approval would
  have occurred if income were X"), while being explicit that this explains the model's
  behaviour, not a causal truth. Check whether the domain requires an intrinsically
  interpretable model instead.
- **Deeper.** How do you handle the fairness question that usually follows? (Disaggregated
  performance evaluation, proxy variable analysis, and documenting the fairness criterion
  chosen.)

### Scenario F — Training a deep model diverges

The loss becomes `NaN` after a few hundred steps.

- **Expected reasoning.** Learning rate too high, exploding gradients, a numerically
  unstable loss (log of zero), unnormalised inputs, division by zero in a custom layer, or
  corrupted labels. Reduce the learning rate, add gradient clipping, check input statistics,
  and try to overfit a single batch to isolate the problem.
- **Deeper.** Why is overfitting one batch a useful diagnostic? (If the model cannot memorise
  ten examples, the problem is in the code or data, not in generalisation.)

### Scenario G — The team wants to use an LLM for a task with a strict correctness
requirement

- **Expected reasoning.** Establish whether errors are detectable and reversible. Ground the
  output with retrieval, constrain the output format and validate it programmatically, add
  abstention when confidence or retrieval quality is low, and keep human review for
  consequential outputs. Evaluate on a representative labelled set before launch, and
  monitor after.
- **Deeper.** Why is a fluent answer not evidence of a correct one? (The model optimises for
  plausible continuation, not verified truth.)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: ai_machine_learning
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [debugging_models, diagnostics, learning_curve, loss_curve, error_analysis]
```

**A structured debugging order for a model that is not working:**

1. **Look at the data.** Sample rows, check label correctness, check for duplicates,
   inspect distributions. Most model problems are data problems.
2. **Establish a baseline.** A constant predictor or a trivial heuristic. If your model does
   not beat it, the problem is not hyperparameters.
3. **Prove the pipeline can learn.** Overfit a tiny subset deliberately. Failure here means
   a bug, not a modelling issue.
4. **Read the learning curves.** High train and validation error means bias; a wide gap means
   variance; a validation curve that rises means overfitting past a point where early
   stopping belongs.
5. **Do error analysis.** Inspect the actual misclassified examples and segment errors by
   feature. This finds label noise, a missing feature, and subgroup failure far faster than
   metric tuning.
6. **Check the metric.** Confirm the metric matches the decision the model supports.

**Specific symptoms.**

- **Training loss decreases, validation loss increases** — overfitting; regularise, get more
  data, or stop earlier.
- **Neither decreases** — learning rate, model capacity, feature quality, or a bug in the
  target.
- **Loss is `NaN`** — learning rate, numerical instability, or bad input values.
- **Great validation, poor test** — the validation set was used too many times for tuning.
- **Great offline, poor online** — skew, drift, leakage, or a population difference.
- **Model works for most inputs but fails on a segment** — under-representation in training
  data or a genuinely different relationship in that segment.
- **Non-reproducible results between runs** — unseeded randomness in splitting,
  initialisation, or data ordering; non-deterministic GPU operations.

---

## 10. Architecture and System Design

```yaml
job_field: ai_machine_learning
topic: ml_system_design
difficulty:
  - medium
  - hard
keywords: [ml_system_design, pipeline, feature_store, serving, retraining, architecture]
```

**A complete ML system design answer covers more than the model.**

1. **Problem framing.** What decision does this support, what is the cost of each error type,
   and is ML necessary?
2. **Data.** Sources, volume, labels and how they are obtained, label delay, and quality.
3. **Feature pipeline.** Batch and streaming computation, consistency between training and
   serving, and a feature store if multiple models share features.
4. **Training pipeline.** Reproducible, scheduled or triggered, with versioned data and
   evaluation gates.
5. **Evaluation.** Offline metrics tied to the objective, subgroup evaluation, and an online
   test design.
6. **Serving.** Batch, online, or streaming; latency and throughput budget; caching;
   fallbacks when the model service is unavailable.
7. **Monitoring.** Operational, drift, performance, and business metrics.
8. **Retraining and rollback.** Trigger, gate, and a fast path back to the previous model.
9. **Governance.** Documentation, access control on data, explainability, and human
   oversight where consequences are significant.

**Recurring architectural decisions.** Batch versus real-time inference (batch is
under-used and often sufficient); a single model versus per-segment models (accuracy versus
maintenance burden); interpretable versus maximally accurate; and buying a hosted model API
versus hosting your own (speed and capability versus cost control, latency, and data
governance).

**Always define the fallback.** What does the product do when the model service times out or
the score is unavailable? A designed default is required; an unhandled exception is not a
fallback.

---

## 11. Security and Privacy

```yaml
job_field: ai_machine_learning
topic: ml_security
difficulty:
  - medium
  - hard
keywords: [adversarial, data_poisoning, model_extraction, prompt_injection, privacy, pii]
```

ML systems add attack surfaces that ordinary software does not have:

- **Adversarial examples** — inputs perturbed to cause misclassification, often
  imperceptibly. Relevant to vision, malware detection, and content moderation. Mitigations
  (adversarial training, input preprocessing, detection) reduce but do not eliminate the
  risk.
- **Data poisoning** — an attacker influences training data to install a backdoor or degrade
  performance. Particularly relevant when training on user-generated or scraped data.
  Mitigations: provenance controls, anomaly detection on training data, and human review of
  data sources.
- **Model extraction and inversion** — repeated querying reconstructs the model or infers
  training data. Mitigations: rate limiting, output granularity limits, and monitoring for
  systematic querying.
- **Membership inference** — determining whether a specific record was in the training set,
  a privacy breach in sensitive domains. Differential privacy provides a formal defence with
  a utility cost.
- **Prompt injection in LLM applications** — untrusted content in the context window
  overrides intended instructions. This is a genuine, currently unsolved class of problem.
  Practical mitigations: treat all retrieved and user content as untrusted data, keep
  privileged instructions out of reach of untrusted text, constrain and validate outputs,
  require confirmation for consequential actions, and apply least privilege to any tools the
  model can invoke.
- **Training data confidentiality.** Models can memorise and reproduce training data.
  Sensitive data in a training corpus can surface in outputs.
- **Standard data protection still applies.** PII minimisation, encryption, access control,
  retention limits, and never copying raw production personal data into notebooks or
  development environments.

The cybersecurity guide holds the canonical depth on cryptography, access control, and
incident response.

---

## 12. Performance and Scalability

```yaml
job_field: ai_machine_learning
topic: performance
difficulty:
  - medium
  - hard
keywords: [training_speed, inference_latency, quantization, distillation, distributed_training, cost]
```

**Training performance.**

- **Data loading is often the bottleneck**, not the GPU. Check utilisation before buying
  more compute.
- **Mixed precision** training reduces memory and increases throughput on supported
  hardware.
- **Distributed training** — data parallelism (replicate the model, shard the batch) is the
  common case; model parallelism is for models that do not fit on one device. Communication
  overhead means scaling is sublinear.
- **Do not scale compute before checking the learning curve.** If more data or more epochs
  no longer improve validation performance, faster training buys nothing.

**Inference performance.**

- **Quantisation** (lower numeric precision), **pruning** (removing weights), and
  **distillation** (training a small model to mimic a large one) are the standard
  compression techniques, each trading some accuracy for latency, memory, and cost.
- **Batching** improves throughput and increases per-request latency; dynamic batching is the
  common compromise in serving systems.
- **Caching** predictions for repeated inputs is often the single largest win and is
  frequently overlooked.
- **Model choice is a latency decision.** A gradient boosting model that answers in 2 ms may
  beat a transformer that is one point more accurate and takes 200 ms, depending on the
  product.

**Cost.** GPU time for training, inference cost per request at scale, storage for datasets
and artifacts, and the engineering time to maintain the system. Per-token or per-request
API pricing for hosted models makes cost a direct function of prompt design and traffic.

**Scalability of the whole system**, not just the model: feature computation, the label
pipeline, monitoring storage, and retraining frequency all scale with data and traffic.

---

## 13. Common Candidate Mistakes

```yaml
job_field: ai_machine_learning
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, ml_pitfalls]
```

- Using accuracy on an imbalanced dataset and declaring success.
- Fitting a scaler, imputer, or encoder on the full dataset before splitting.
- Random shuffling of time series data.
- Splitting grouped data (same user, patient, or session) across train and test.
- Resampling or applying SMOTE before the split rather than inside the fold.
- Not recognising that an implausibly high score is probably leakage.
- Treating deep learning as the default for a small tabular dataset.
- Confusing AI, machine learning, and deep learning.
- Interpreting a p-value as the probability that the hypothesis is true.
- Treating correlation as causation, or reading regression coefficients as causal effects.
- Reporting a single aggregate metric with no subgroup breakdown and no uncertainty.
- Tuning hyperparameters against the test set and then reporting that number.
- Ignoring calibration when the probability itself drives the decision.
- Believing removing a protected attribute makes a model fair.
- Assuming a deployed model keeps working without monitoring or retraining.
- Reading a t-SNE plot as if inter-cluster distances were meaningful.
- Describing an LLM's fluent output as evidence of correctness.
- Having no baseline to compare against.

---

## 14. Interview Evaluation Points

```yaml
job_field: ai_machine_learning
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, ml_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Problem framing** — whether they ask what decision the model supports and what each
  error costs before discussing algorithms.
- **Evaluation discipline** — correct metric choice for the problem, awareness of imbalance,
  and honest use of a held-out test set.
- **Leakage awareness** — whether it is a reflex to check, and whether they treat a
  too-good score as suspicious.
- **Validation design** — whether the split respects time, grouping, and stratification.
- **The bias–variance trade-off** — diagnosed from learning curves rather than recited.
- **Model selection reasoning** — whether they can justify a simpler model, and know when
  deep learning is not the answer.
- **Production reality** — training/serving skew, drift, monitoring, and retraining raised
  without prompting.
- **Statistical literacy** — p-values, base rates, correlation versus causation, and
  uncertainty.
- **Responsible AI** — whether fairness and explainability are engaged with substantively
  rather than as a checkbox, including awareness that fairness definitions conflict.
- **Honesty about uncertainty** — willingness to say a result is not trustworthy yet.

**Adaptive guidance.** A strong evaluation or deep learning answer should escalate to ML
system design, drift handling, or fairness trade-offs. A weak answer on deep learning should
step down to model evaluation, preprocessing, or statistics fundamentals — not to another
neural network architecture question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: ai_machine_learning
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, ml_dependencies]
```

Distinctions that must not be collapsed:

- **AI ⊃ Machine Learning ⊃ Deep Learning.** Three nested scopes, not synonyms.
- **Machine learning is not statistics**, though it rests on it. ML prioritises predictive
  performance; classical statistics prioritises inference and uncertainty about parameters.
- **Correlation is not causation**, and a predictive model is not a causal model.
- **Accuracy is not performance.** The metric must match the decision.
- **Overfitting is not high variance in the data.** It is model sensitivity to the training
  sample.
- **A neural network is not automatically better than gradient boosting**, especially on
  tabular data.
- **Feature importance is not causal effect.**
- **Explainability is not interpretability.** Post-hoc explanation of a black box differs
  from a model that is inherently readable.
- **Fine-tuning is not retrieval-augmented generation.** Changing model weights versus
  conditioning on retrieved context.
- **Model training is not the ML system.** Most of the engineering is data, serving, and
  monitoring.
- **Data drift is not concept drift.** Input distribution change versus relationship change.

Topic progression for adaptive interviews (easy to hard):

`ml_overview -> statistics -> data_preprocessing -> supervised_learning -> model_evaluation -> overfitting -> cross_validation -> feature_engineering -> deep_learning -> mlops -> ml_system_design`

Breadth track when the candidate stalls (use after repeated weak answers):

- Weak on deep learning → `model_evaluation` or `data_preprocessing`
- Weak on MLOps → `python_for_ml` or `supervised_learning`
- Weak on statistics → `pandas`/`numpy` practical data handling
- Weak on NLP → `classification` and evaluation fundamentals
- Weak on system design → `overfitting` and validation basics

Canonical depth lives elsewhere for:

- Pipelines, warehouses, Spark, Kafka, data quality —
  `data_engineering_interview_guide.md`
- Model serving infrastructure, containers, Kubernetes, CI/CD —
  `devops_cloud_interview_guide.md`
- API design for model services, caching, authentication —
  `backend_development_interview_guide.md`
- Cost, scaling, and cloud service selection —
  `cloud_architecture_interview_guide.md`
- Cryptography, threat modelling, privacy regulation detail —
  `cybersecurity_interview_guide.md`
- Algorithms, complexity, and general software design —
  `software_engineering_interview_guide.md`
