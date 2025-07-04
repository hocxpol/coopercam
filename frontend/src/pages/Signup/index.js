import React, { useState, useEffect } from "react";
import qs from 'query-string'

import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";
import usePlans from "../../hooks/usePlans";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import InputMask from 'react-input-mask';
import {
	FormControl,
	InputLabel,
	MenuItem,
	Select,
} from "@material-ui/core";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import logo from "../../assets/glorium-chat/logo-glorium-chat.webp";
import { i18n } from "../../translate/i18n";

import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import moment from "moment";
const Copyright = () => {
	return (
	  <Typography variant="body2" color="textSecondary" align="center">
		{"Copyright © "}
		<Link 
		  color="inherit" 
		  href="https://glorium.chat" 
		  target="_blank" 
		  rel="noopener noreferrer"
		  style={{ textDecoration: 'none' }}
		>
			Glorium.Chat
		</Link>{" "}
		{new Date().getFullYear()}
		{" - Todos os direitos reservados."}
	  </Typography>
	);
  };

const useStyles = makeStyles(theme => ({
	paper: {
		marginTop: theme.spacing(8),
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
	},
	avatar: {
		margin: theme.spacing(1),
		backgroundColor: theme.palette.secondary.main,
	},
	form: {
		width: "100%",
		marginTop: theme.spacing(3),
	},
	submit: {
		margin: theme.spacing(3, 0, 2),
	},
}));

const UserSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, i18n.t("validation.minLength", { min: 2 }))
		.max(50, i18n.t("validation.maxLength", { max: 50 }))
		.required(i18n.t("validation.required")),
	password: Yup.string()
		.min(5, i18n.t("validation.minLength", { min: 5 }))
		.max(50, i18n.t("validation.maxLength", { max: 50 })),
	email: Yup.string()
		.email(i18n.t("validation.invalidEmail"))
		.required(i18n.t("validation.required")),
});


const SignUp = () => {
	const classes = useStyles();
	const history = useHistory();
	let companyId = null

	const params = qs.parse(window.location.search)
	if (params.companyId !== undefined) {
		companyId = params.companyId
	}

	const initialState = { name: "", email: "", phone: "", password: "", planId: "", };

	const [user] = useState(initialState);
	const dueDate = moment().add(15, "day").format();
	const handleSignUp = async (values) => {
		// Remove formatações do telefone antes de enviar ao backend
		values.phone = values.phone.replace(/\D/g, ""); // Remove todos os caracteres não numéricos
		
		Object.assign(values, { recurrence: "MENSAL" });
		Object.assign(values, { dueDate: dueDate });
		Object.assign(values, { status: "t" });
		Object.assign(values, { campaignsEnabled: true });
		try {
			await openApi.post("/companies/cadastro", values);
			toast.success(i18n.t("signup.toasts.success"));
			history.push("/login");
		} catch (err) {
			console.log(err);
			toastError(err);
		}
	};

	const [plans, setPlans] = useState([]);
	const { list: listPlans } = usePlans();

	useEffect(() => {
		async function fetchData() {
			const list = await listPlans();
			setPlans(list);
		}
		fetchData();
	}, [listPlans]);


	return (
		<Container component="main" maxWidth="xs">
			<CssBaseline />
			<div className={classes.paper}>
				<div>
					<center><img style={{ margin: "0 auto", width: "70%" }} src={logo} alt="Whats" /></center>
				</div>
				{/*<Typography component="h1" variant="h5">
					{i18n.t("signup.title")}
				</Typography>*/}
				{/* <form className={classes.form} noValidate onSubmit={handleSignUp}> */}
				<Formik
					initialValues={user}
					enableReinitialize={true}
					validationSchema={UserSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSignUp(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting }) => (
						<Form className={classes.form}>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Field
										as={TextField}
										autoComplete="name"
										name="name"
										error={touched.name && Boolean(errors.name)}
										helperText={touched.name && errors.name}
										variant="outlined"
										fullWidth
										id="name"
										label="Nome da Empresa"
									/>
								</Grid>

<Grid item xs={12}>
	<Field
		as={TextField}
		variant="outlined"
		fullWidth
		id="email"
		label={i18n.t("signup.form.email")}
		name="email"
		error={touched.email && Boolean(errors.email)}
		helperText={touched.email && errors.email}
		autoComplete="email"
		required
		InputProps={{
			style: { textTransform: "lowercase" }, // Exibe o texto em minúsculas
		}}
		onInput={(event) => {
			// Converte o texto para minúsculas em tempo real
			event.target.value = event.target.value.toLowerCase();
		}}
	/>
</Grid>
<Grid item xs={12}>
	<Field name="phone">
	{({ field }) => (
		<InputMask
		{...field}
		mask="(99) 99999-9999"
		alwaysShowMask={false} // Evita que o cursor fique preso no "-"
		maskChar={null} // Remove o caractere de preenchimento padrão
		onChange={(event) => {
			field.onChange({
				target: {
					name: field.name,
					value: event.target.value, // Mantém o valor formatado no campo
				},
			});
		}}
		>
		{(inputProps) => (
			<TextField
				{...inputProps}
				variant="outlined"
				fullWidth
				label="Telefone com (DDD)"
				inputProps={{
					maxLength: 15, // Limita o tamanho do input
				}}
			/>
		)}
		</InputMask>
	)}
	</Field>
</Grid>
								<Grid item xs={12}>
									<Field
										as={TextField}
										variant="outlined"
										fullWidth
										name="password"
										error={touched.password && Boolean(errors.password)}
										helperText={touched.password && errors.password}
										label={i18n.t("signup.form.password")}
										type="password"
										id="password"
										autoComplete="current-password"
										required
									/>
								</Grid>
								<Grid item xs={12}>
									<InputLabel htmlFor="plan-selection">Plano</InputLabel>
									<Field
										as={Select}
										variant="outlined"
										fullWidth
										id="plan-selection"
										label="Plano"
										name="planId"
										required
									>
										{plans.map((plan, key) => (
											<MenuItem key={key} value={plan.id}>
												{plan.name} - Atendentes: {plan.users} - WhatsApp: {plan.connections} - Departamentos: {plan.queues} - R$ {plan.value}
											</MenuItem>
										))}
									</Field>
								</Grid>
							</Grid>
							<Button
								type="submit"
								fullWidth
								variant="contained"
								color="primary"
								className={classes.submit}
							>
								{i18n.t("signup.buttons.submit")}
							</Button>
							<Grid container justify="flex-end">
								<Grid item>
									<Link
										href="#"
										variant="body2"
										component={RouterLink}
										to="/login"
									>
										{i18n.t("signup.buttons.login")}
									</Link>
								</Grid>
							</Grid>
						</Form>
					)}
				</Formik>
			</div>
			<Box mt={5}>{<Copyright />}</Box>
		</Container>
	);
};

export default SignUp;
