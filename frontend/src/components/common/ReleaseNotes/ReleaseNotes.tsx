import { Octokit } from '@octokit/core';
import React from 'react';
import semver from 'semver';
import helpers from '../../../helpers';
import ReleaseNotesModal from './ReleaseNotesModal';
import UpdatePopup from './UpdatePopup';

export default function ReleaseNotes() {
  const { desktopApi } = window;
  const [releaseNotes, setReleaseNotes] = React.useState<string>();
  const [releaseDownloadURL, setReleaseDownloadURL] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (desktopApi) {
      desktopApi.receive('appVersion', (currentBuildAppVersion: string) => {
        const octokit = new Octokit();

        async function fetchRelease() {
          const githubReleaseURL = `GET /repos/{owner}/{repo}/releases`;
          // get me all the releases -> default decreasing order of releases
          const response = await octokit.request(githubReleaseURL, {
            owner: 'kinvolk',
            repo: 'headlamp',
          });
          const latestRelease = response.data.find(
            release => !release.name?.startsWith('headlamp-helm')
          );
          if (
            latestRelease &&
            semver.gt(latestRelease.name as string, currentBuildAppVersion) &&
            !process.env.FLATPAK_ID
          ) {
            setReleaseDownloadURL(latestRelease.html_url);
          }
          /*
    check if there is already a version in store if it exists don't store the current version
    this check will help us later in determining whether we are on the latest release or not
    */
          const storedAppVersion = helpers.getAppVersion();
          if (!storedAppVersion) {
            helpers.setAppVersion(currentBuildAppVersion);
          } else if (semver.lt(storedAppVersion as string, currentBuildAppVersion)) {
            // get the release notes for the version with which the app was built with
            const githubReleaseURL = `GET /repos/{owner}/{repo}/releases/tags/v${currentBuildAppVersion}`;
            const response = await octokit.request(githubReleaseURL, {
              owner: 'kinvolk',
              repo: 'headlamp',
            });
            const [releaseNotes] = response.data.body.split('<!-- end-release-notes -->');
            setReleaseNotes(releaseNotes);
            // set the store version to latest so that we don't show release notes on
            // every start of app
            helpers.setAppVersion(currentBuildAppVersion);
          }
        }
        const isUpdateCheckingDisabled = JSON.parse(
          localStorage.getItem('disable_update_check') || 'false'
        );
        if (!isUpdateCheckingDisabled) {
          fetchRelease();
        }
      });
    }
  }, []);

  return (
    <>
      {releaseDownloadURL && <UpdatePopup releaseDownloadURL={releaseDownloadURL} />}
      {releaseNotes && <ReleaseNotesModal releaseNotes={releaseNotes} />}
    </>
  );
}